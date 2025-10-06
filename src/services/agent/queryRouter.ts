interface QueryComplexity {
  level: 'instant' | 'simple' | 'medium' | 'complex';
  confidence: number;
  reasons: string[];
}

export class QueryRouter {
  
  analyzeComplexity(query: string): QueryComplexity {
    const reasons: string[] = [];
    let complexityScore = 0;
    
    // Ultra-simple patterns (instant responses)
    const instantPatterns = [
      { pattern: /^(hello|hi|hey|good morning|good afternoon|good evening)$/i, points: -5, reason: 'Simple greeting' },
      { pattern: /^(thanks?|thank you|bye|goodbye|see you)$/i, points: -5, reason: 'Simple acknowledgment' },
      { pattern: /^(yes|no|ok|okay|sure|alright)$/i, points: -5, reason: 'Simple response' }
    ];
    
    // Simple patterns (Haiku can handle)
    const simplePatterns = [
      { pattern: /^(what|show|list|get|find|search)\s/i, points: -2, reason: 'Simple retrieval command' },
      { pattern: /^how many/i, points: -2, reason: 'Simple count query' },
      { pattern: /documents?|facts?|notes?/i, points: -1, reason: 'Basic data access' }
    ];
    
    // Complex patterns (needs Sonnet)
    const complexPatterns = [
      { pattern: /analyze|compare|evaluate|assess/i, points: 3, reason: 'Requires analysis' },
      { pattern: /organize|categorize|structure|plan/i, points: 3, reason: 'Requires organization' },
      { pattern: /create.*plan|study plan|learning path/i, points: 4, reason: 'Multi-step planning' },
      { pattern: /why|explain|understand|reason/i, points: 2, reason: 'Requires reasoning' },
      { pattern: /best|recommend|suggest|should/i, points: 2, reason: 'Requires judgment' },
      { pattern: /help me (with|prepare|understand)/i, points: 2, reason: 'Complex assistance' }
    ];
    
    // Multi-part queries
    if (query.includes(' and ') || query.includes(', then') || query.includes('; ')) {
      complexityScore += 2;
      reasons.push('Multi-part request');
    }
    
    // Length heuristic (longer = more complex usually)
    if (query.split(' ').length > 20) {
      complexityScore += 1;
      reasons.push('Detailed query');
    }
    
    // Check instant patterns first
    for (const { pattern, points, reason } of instantPatterns) {
      if (pattern.test(query)) {
        complexityScore += points;
        reasons.push(reason);
      }
    }
    
    // Check simple patterns
    for (const { pattern, points, reason } of simplePatterns) {
      if (pattern.test(query)) {
        complexityScore += points;
        reasons.push(reason);
      }
    }
    
    // Check complex patterns
    for (const { pattern, points, reason } of complexPatterns) {
      if (pattern.test(query)) {
        complexityScore += points;
        reasons.push(reason);
      }
    }
    
    // Determine level
    let level: 'instant' | 'simple' | 'medium' | 'complex';
    if (complexityScore <= -3) {
      level = 'instant';
    } else if (complexityScore <= 0) {
      level = 'simple';
    } else if (complexityScore <= 3) {
      level = 'medium';
    } else {
      level = 'complex';
    }
    
    const confidence = Math.min(0.95, 0.6 + (Math.abs(complexityScore) * 0.1));
    
    return { level, confidence, reasons };
  }
  
  isInstantResponse(query: string): boolean {
    const complexity = this.analyzeComplexity(query);
    return complexity.level === 'instant';
  }
  
  shouldUseHaiku(query: string): boolean {
    const complexity = this.analyzeComplexity(query);
    return complexity.level === 'simple' || complexity.level === 'instant';
  }
  
  shouldUseSonnet(query: string): boolean {
    const complexity = this.analyzeComplexity(query);
    return complexity.level === 'complex';
  }
  
  getRecommendedModel(query: string): 'haiku' | 'sonnet' {
    const complexity = this.analyzeComplexity(query);
    
    if (complexity.level === 'instant' || complexity.level === 'simple') return 'haiku';
    if (complexity.level === 'complex') return 'sonnet';
    
    // Medium complexity: default to Haiku, let it escalate if needed
    return 'haiku';
  }
}
