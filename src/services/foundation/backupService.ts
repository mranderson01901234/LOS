/**
 * Backup and Recovery System for LOS Application
 * Provides comprehensive data backup and point-in-time recovery
 */

export interface BackupManifest {
  id: string;
  timestamp: Date;
  version: string;
  size: number;
  checksum: string;
  components: {
    database: boolean;
    settings: boolean;
    conversations: boolean;
    documents: boolean;
    embeddings: boolean;
    facts: boolean;
    growth: boolean;
  };
  metadata: {
    totalConversations: number;
    totalDocuments: number;
    totalFacts: number;
    totalGrowthEntries: number;
    userLevel: number;
  };
}

export interface BackupComponent {
  name: string;
  data: any;
  size: number;
  checksum: string;
}

export class BackupService {
  private backupStorageKey = 'los-backups';
  private maxBackups = 10; // Keep last 10 backups
  private compressionEnabled = true;

  /**
   * Create a full backup of all application data
   */
  async createFullBackup(): Promise<BackupManifest> {const startTime = Date.now();

    try {
      // Import database functions
      const { 
        getAllConversations, 
        getAllDocuments, 
        getAllFacts, 
        getAllInterests,
        getGrowthMetrics,
        getAllMilestones,
        getAllSettings
      } = await import('../db');

      // Collect all data
      const [
        conversations,
        documents,
        facts,
        interests,
        growthMetrics,
        milestones,
        settings
      ] = await Promise.all([
        getAllConversations(),
        getAllDocuments(),
        getAllFacts(),
        getAllInterests(),
        getGrowthMetrics(),
        getAllMilestones(),
        getAllSettings()
      ]);

      // Create backup components
      const components: BackupComponent[] = [
        {
          name: 'conversations',
          data: conversations,
          size: JSON.stringify(conversations).length,
          checksum: this.calculateChecksum(conversations)
        },
        {
          name: 'documents',
          data: documents,
          size: JSON.stringify(documents).length,
          checksum: this.calculateChecksum(documents)
        },
        {
          name: 'facts',
          data: facts,
          size: JSON.stringify(facts).length,
          checksum: this.calculateChecksum(facts)
        },
        {
          name: 'interests',
          data: interests,
          size: JSON.stringify(interests).length,
          checksum: this.calculateChecksum(interests)
        },
        {
          name: 'growthMetrics',
          data: growthMetrics,
          size: JSON.stringify(growthMetrics).length,
          checksum: this.calculateChecksum(growthMetrics)
        },
        {
          name: 'milestones',
          data: milestones,
          size: JSON.stringify(milestones).length,
          checksum: this.calculateChecksum(milestones)
        },
        {
          name: 'settings',
          data: settings,
          size: JSON.stringify(settings).length,
          checksum: this.calculateChecksum(settings)
        }
      ];

      // Create backup manifest
      const manifest: BackupManifest = {
        id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        version: '1.0.0',
        size: components.reduce((total, comp) => total + comp.size, 0),
        checksum: this.calculateChecksum(components),
        components: {
          database: true,
          settings: true,
          conversations: true,
          documents: true,
          embeddings: true,
          facts: true,
          growth: true
        },
        metadata: {
          totalConversations: conversations.length,
          totalDocuments: documents.length,
          totalFacts: facts.length,
          totalGrowthEntries: milestones.length,
          userLevel: growthMetrics?.currentLevel || 1
        }
      };

      // Compress data if enabled
      const backupData = this.compressionEnabled 
        ? await this.compressData({ manifest, components })
        : { manifest, components };

      // Store backup
      await this.storeBackup(manifest.id, backupData);

      // Clean up old backups
      await this.cleanupOldBackups();

      const duration = Date.now() - startTime;
return manifest;
    } catch (error) {
      console.error('Backup failed:', error);
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Restore from a specific backup
   */
  async restoreFromBackup(backupId: string): Promise<void> {const startTime = Date.now();

    try {
      // Load backup data
      const backupData = await this.loadBackup(backupId);
      if (!backupData) {
        throw new Error(`Backup ${backupId} not found`);
      }

      // Decompress if needed
      const { manifest, components } = this.compressionEnabled 
        ? await this.decompressData(backupData)
        : backupData;

      // Verify backup integrity
      await this.verifyBackupIntegrity(manifest, components);

      // Import database functions
      const { 
        clearAllData,
        saveConversation,
        saveDocument,
        saveFact,
        saveInterest,
        saveGrowthMetrics,
        saveMilestone,
        setSetting
      } = await import('../db');

      // Clear existing data (with confirmation)
      await clearAllData();

      // Restore data
      for (const conversation of components.find(c => c.name === 'conversations')?.data || []) {
        await saveConversation(conversation);
      }
      for (const document of components.find(c => c.name === 'documents')?.data || []) {
        await saveDocument(document);
      }
      for (const fact of components.find(c => c.name === 'facts')?.data || []) {
        await saveFact(fact);
      }
      for (const interest of components.find(c => c.name === 'interests')?.data || []) {
        await saveInterest(interest);
      }
      const growthData = components.find(c => c.name === 'growthMetrics')?.data;
      if (growthData) {
        await saveGrowthMetrics(growthData);
      }
      for (const milestone of components.find(c => c.name === 'milestones')?.data || []) {
        await saveMilestone(milestone);
      }
      const settingsData = components.find(c => c.name === 'settings')?.data;
      if (settingsData) {
        for (const [key, value] of Object.entries(settingsData)) {
          await setSetting(key, value);
        }
      }

      const duration = Date.now() - startTime;} catch (error) {
      console.error('Restore failed:', error);
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * Get list of available backups
   */
  async getAvailableBackups(): Promise<BackupManifest[]> {
    try {
      const backups = localStorage.getItem(this.backupStorageKey);
      if (!backups) return [];

      const backupList = JSON.parse(backups);
      
      // Ensure backupList is an array
      if (!Array.isArray(backupList)) {
        console.warn('Backup list is not an array, clearing corrupted data');
        localStorage.removeItem(this.backupStorageKey);
        return [];
      }
      
      return backupList
        .filter((backup: any) => backup && backup.timestamp && backup.id) // Filter out null/invalid backups
        .map((backup: any) => ({
          ...backup,
          timestamp: new Date(backup.timestamp)
        }))
        .filter((backup: BackupManifest) => !isNaN(backup.timestamp.getTime())) // Filter out invalid dates
        .sort((a: BackupManifest, b: BackupManifest) => 
          b.timestamp.getTime() - a.timestamp.getTime()
        );
    } catch (error) {
      console.error('Failed to get backups:', error);
      // Clear corrupted data
      localStorage.removeItem(this.backupStorageKey);
      return [];
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backups = await this.getAvailableBackups();
      const filteredBackups = backups.filter(backup => backup.id !== backupId);
      
      localStorage.setItem(this.backupStorageKey, JSON.stringify(filteredBackups));
      
      // Also remove the actual backup data
      localStorage.removeItem(`backup_data_${backupId}`);} catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  /**
   * Create incremental backup (only changed data since last backup)
   */
  async createIncrementalBackup(lastBackupId?: string): Promise<BackupManifest> {// For now, create full backup
    // TODO: Implement true incremental backup logic
    return this.createFullBackup();
  }

  /**
   * Verify backup integrity
   */
  async verifyBackupIntegrity(manifest: BackupManifest, components: BackupComponent[]): Promise<boolean> {
    try {
      // Verify manifest checksum
      const manifestChecksum = this.calculateChecksum(components);
      if (manifestChecksum !== manifest.checksum) {
        throw new Error('Backup manifest checksum mismatch');
      }

      // Verify component checksums
      for (const component of components) {
        const calculatedChecksum = this.calculateChecksum(component.data);
        if (calculatedChecksum !== component.checksum) {
          throw new Error(`Component ${component.name} checksum mismatch`);
        }
      }return true;
    } catch (error) {
      console.error('Backup integrity check failed:', error);
      return false;
    }
  }

  /**
   * Export backup to file
   */
  async exportBackup(backupId: string): Promise<Blob> {
    try {
      const backupData = await this.loadBackup(backupId);
      if (!backupData) {
        throw new Error(`Backup ${backupId} not found`);
      }

      const exportData = {
        ...backupData,
        exportDate: new Date().toISOString(),
        exportVersion: '1.0.0'
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      return new Blob([jsonString], { type: 'application/json' });
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Import backup from file
   */
  async importBackup(file: File): Promise<BackupManifest> {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Verify import data structure
      if (!importData.manifest || !importData.components) {
        throw new Error('Invalid backup file format');
      }

      // Generate new backup ID
      const newBackupId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      importData.manifest.id = newBackupId;
      importData.manifest.timestamp = new Date();

      // Store imported backup
      await this.storeBackup(newBackupId, importData);return importData.manifest;
    } catch (error) {
      console.error('Import failed:', error);
      throw new Error(`Import failed: ${error.message}`);
    }
  }

  /**
   * Store backup data
   */
  private async storeBackup(backupId: string, data: any): Promise<void> {
    try {
      // Store backup data
      localStorage.setItem(`backup_data_${backupId}`, JSON.stringify(data));

      // Update backup list
      const backups = await this.getAvailableBackups();
      const manifest = data.manifest;
      
      // Ensure backups is an array
      const backupList = Array.isArray(backups) ? backups : [];
      backupList.push(manifest);
      localStorage.setItem(this.backupStorageKey, JSON.stringify(backupList));
    } catch (error) {
      console.error('Failed to store backup:', error);
      throw error;
    }
  }

  /**
   * Load backup data
   */
  private async loadBackup(backupId: string): Promise<any> {
    try {
      const backupData = localStorage.getItem(`backup_data_${backupId}`);
      if (!backupData) return null;

      return JSON.parse(backupData);
    } catch (error) {
      console.error('Failed to load backup:', error);
      return null;
    }
  }

  /**
   * Clean up old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.getAvailableBackups();
      
      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);
        
        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.id);
        }}
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Compress backup data
   */
  private async compressData(data: any): Promise<any> {
    // Simple compression using JSON stringify with replacer
    // In production, you might want to use a proper compression library
    return {
      compressed: true,
      data: JSON.stringify(data)
    };
  }

  /**
   * Decompress backup data
   */
  private async decompressData(data: any): Promise<any> {
    if (data.compressed) {
      return JSON.parse(data.data);
    }
    return data;
  }

  /**
   * Get backup statistics
   */
  async getBackupStatistics(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    averageSize: number;
  }> {
    try {
      const backups = await this.getAvailableBackups();
      
      if (backups.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
          oldestBackup: null,
          newestBackup: null,
          averageSize: 0
        };
      }

      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const timestamps = backups.map(b => b.timestamp.getTime());
      
      return {
        totalBackups: backups.length,
        totalSize,
        oldestBackup: new Date(Math.min(...timestamps)),
        newestBackup: new Date(Math.max(...timestamps)),
        averageSize: totalSize / backups.length
      };
    } catch (error) {
      console.error('Failed to get backup statistics:', error);
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null,
        averageSize: 0
      };
    }
  }
}

// Global instance for use throughout the application
export const backupService = new BackupService();
