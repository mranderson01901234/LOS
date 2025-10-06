/**
 * Data Integrity Validator
 * 
 * Validates the integrity of the LOS database and data structures,
 * ensuring data consistency and identifying potential issues.
 */

export interface IntegrityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

export interface ValidationResult {
  overall: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  checks: IntegrityCheck[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export class DataIntegrityValidator {
  /**
   * Run comprehensive data integrity checks
   */
  async validateAll(): Promise<ValidationResult> {
    const checks: IntegrityCheck[] = [];
    
    try {
      // Run all validation checks
      const [
        dbCheck,
        conversationCheck,
        documentCheck,
        factCheck,
        settingCheck
      ] = await Promise.all([
        this.checkDatabaseIntegrity(),
        this.checkConversationIntegrity(),
        this.checkDocumentIntegrity(),
        this.checkFactIntegrity(),
        this.checkSettingIntegrity()
      ]);

      checks.push(...dbCheck);
      checks.push(...conversationCheck);
      checks.push(...documentCheck);
      checks.push(...factCheck);
      checks.push(...settingCheck);

    } catch (error) {
      checks.push({
        name: 'Validation Process',
        status: 'FAIL',
        message: `Failed to complete validation: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    // Calculate summary
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'PASS').length,
      failed: checks.filter(c => c.status === 'FAIL').length,
      warnings: checks.filter(c => c.status === 'WARN').length
    };

    // Determine overall status
    let overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    if (summary.failed > 0) {
      overall = 'CRITICAL';
    } else if (summary.warnings > 0) {
      overall = 'WARNING';
    }

    return {
      overall,
      checks,
      summary
    };
  }

  /**
   * Check database integrity
   */
  private async checkDatabaseIntegrity(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];
    
    try {
      const { 
        getAllConversations, 
        getAllDocuments, 
        getAllFacts, 
        getAllSettings 
      } = await import('../db');
      
      // Check conversations
      const conversations = await getAllConversations();
      const conversationCheck = this.validateConversations(conversations);
      checks.push(conversationCheck);
      
      // Check documents
      const documents = await getAllDocuments();
      const documentCheck = this.validateDocuments(documents);
      checks.push(documentCheck);
      
      // Check facts
      const facts = await getAllFacts();
      const factCheck = this.validateFacts(facts);
      checks.push(factCheck);
      
      // Check settings
      const settings = await getAllSettings();
      const settingCheck = this.validateSettings(settings);
      checks.push(settingCheck);
      
    } catch (error) {
      checks.push({
        name: 'Database Access',
        status: 'FAIL',
        message: `Failed to access database: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    return checks;
  }

  /**
   * Validate conversations
   */
  private validateConversations(conversations: any[]): IntegrityCheck {
    const issues: string[] = [];
    
    // Check for required fields
    conversations.forEach((conv, index) => {
      if (!conv.id) issues.push(`Conversation ${index} missing ID`);
      if (!conv.title && !conv.messages) issues.push(`Conversation ${index} has no title or messages`);
      if (conv.createdAt && isNaN(new Date(conv.createdAt).getTime())) {
        issues.push(`Conversation ${index} has invalid createdAt date`);
      }
    });

    // Check for duplicate IDs
    const ids = conversations.map(c => c.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('Duplicate conversation IDs found');
    }

    return {
      name: 'Conversations',
      status: issues.length === 0 ? 'PASS' : 'WARN',
      message: issues.length === 0 ? 'All conversations are valid' : `Found ${issues.length} issues`,
      details: { issues, count: conversations.length }
    };
  }

  /**
   * Validate documents
   */
  private validateDocuments(documents: any[]): IntegrityCheck {
    const issues: string[] = [];
    
    documents.forEach((doc, index) => {
      if (!doc.id) issues.push(`Document ${index} missing ID`);
      if (!doc.title) issues.push(`Document ${index} missing title`);
      if (!doc.type) issues.push(`Document ${index} missing type`);
      if (doc.createdAt && isNaN(new Date(doc.createdAt).getTime())) {
        issues.push(`Document ${index} has invalid createdAt date`);
      }
    });

    // Check for duplicate IDs
    const ids = documents.map(d => d.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('Duplicate document IDs found');
    }

    return {
      name: 'Documents',
      status: issues.length === 0 ? 'PASS' : 'WARN',
      message: issues.length === 0 ? 'All documents are valid' : `Found ${issues.length} issues`,
      details: { issues, count: documents.length }
    };
  }

  /**
   * Validate facts
   */
  private validateFacts(facts: any[]): IntegrityCheck {
    const issues: string[] = [];
    
    facts.forEach((fact, index) => {
      if (!fact.id) issues.push(`Fact ${index} missing ID`);
      if (!fact.content) issues.push(`Fact ${index} missing content`);
      if (!fact.category) issues.push(`Fact ${index} missing category`);
      if (fact.createdAt && isNaN(new Date(fact.createdAt).getTime())) {
        issues.push(`Fact ${index} has invalid createdAt date`);
      }
    });

    // Check for duplicate IDs
    const ids = facts.map(f => f.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      issues.push('Duplicate fact IDs found');
    }

    return {
      name: 'Facts',
      status: issues.length === 0 ? 'PASS' : 'WARN',
      message: issues.length === 0 ? 'All facts are valid' : `Found ${issues.length} issues`,
      details: { issues, count: facts.length }
    };
  }

  /**
   * Validate settings
   */
  private validateSettings(settings: any[]): IntegrityCheck {
    const issues: string[] = [];
    
    settings.forEach((setting, index) => {
      if (!setting.key) issues.push(`Setting ${index} missing key`);
      if (setting.value === undefined || setting.value === null) {
        issues.push(`Setting ${index} has null/undefined value`);
      }
    });

    // Check for duplicate keys
    const keys = settings.map(s => s.key).filter(Boolean);
    const uniqueKeys = new Set(keys);
    if (keys.length !== uniqueKeys.size) {
      issues.push('Duplicate setting keys found');
    }

    return {
      name: 'Settings',
      status: issues.length === 0 ? 'PASS' : 'WARN',
      message: issues.length === 0 ? 'All settings are valid' : `Found ${issues.length} issues`,
      details: { issues, count: settings.length }
    };
  }

  /**
   * Check conversation integrity
   */
  private async checkConversationIntegrity(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];
    
    try {
      const { getAllConversations } = await import('../db');
      const conversations = await getAllConversations();
      
      const validation = this.validateConversations(conversations);
      checks.push(validation);
      
    } catch (error) {
      checks.push({
        name: 'Conversation Integrity',
        status: 'FAIL',
        message: `Failed to validate conversations: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    return checks;
  }

  /**
   * Check document integrity
   */
  private async checkDocumentIntegrity(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];
    
    try {
      const { getAllDocuments } = await import('../db');
      const documents = await getAllDocuments();
      
      const validation = this.validateDocuments(documents);
      checks.push(validation);
      
    } catch (error) {
      checks.push({
        name: 'Document Integrity',
        status: 'FAIL',
        message: `Failed to validate documents: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    return checks;
  }

  /**
   * Check fact integrity
   */
  private async checkFactIntegrity(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];
    
    try {
      const { getAllFacts } = await import('../db');
      const facts = await getAllFacts();
      
      const validation = this.validateFacts(facts);
      checks.push(validation);
      
    } catch (error) {
      checks.push({
        name: 'Fact Integrity',
        status: 'FAIL',
        message: `Failed to validate facts: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    return checks;
  }

  /**
   * Check setting integrity
   */
  private async checkSettingIntegrity(): Promise<IntegrityCheck[]> {
    const checks: IntegrityCheck[] = [];
    
    try {
      const { getAllSettings } = await import('../db');
      const settings = await getAllSettings();
      
      const validation = this.validateSettings(settings);
      checks.push(validation);
      
    } catch (error) {
      checks.push({
        name: 'Setting Integrity',
        status: 'FAIL',
        message: `Failed to validate settings: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }
    
    return checks;
  }

  /**
   * Get validation summary
   */
  async getSummary(): Promise<string> {
    const result = await this.validateAll();
    
    return `Data Integrity Status: ${result.overall}
Total Checks: ${result.summary.total}
Passed: ${result.summary.passed}
Failed: ${result.summary.failed}
Warnings: ${result.summary.warnings}

${result.checks.map(check => 
  `${check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌'} ${check.name}: ${check.message}`
).join('\n')}`;
  }
}

// Export singleton instance
export const dataIntegrityValidator = new DataIntegrityValidator();