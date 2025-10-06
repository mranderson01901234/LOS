interface PreRouteResult {
  shouldRoute: boolean;
  response?: string;
  reason?: string;
}

export class PreRouter {
  
  /**
   * Check if query is trivial and can be handled without agent/API
   * Returns instant response for: greetings, simple math, time/date, acknowledgments
   */
  async checkTrivial(query: string): Promise<PreRouteResult> {
    const normalized = query.toLowerCase().trim();
    
    // === SAFETY CHECK: Don't pre-route complex questions ===
    // If the query is asking for explanations, analysis, or comprehensive answers, route to agent
    const complexQuestionPatterns = [
      /explain.*benefits/i,
      /what.*would.*be/i,
      /analyze.*impact/i,
      /comprehensive.*overview/i,
      /detailed.*explanation/i,
      /pros.*and.*cons/i,
      /advantages.*disadvantages/i,
      /how.*does.*work/i,
      /why.*is.*important/i,
      /what.*are.*the.*implications/i
    ];
    
    for (const pattern of complexQuestionPatterns) {
      if (pattern.test(normalized)) {return { shouldRoute: true };
      }
    }
    
    // === GREETINGS ===
    const greetingPatterns = [
      /^(hi|hey|hello|yo|sup|wassup|greetings)[\s!.]*$/,
      /^good (morning|afternoon|evening|day)[\s!.]*$/,
      /^how are you[\s?!.]*$/,
      /^what'?s up[\s?!.]*$/
    ];
    
    for (const pattern of greetingPatterns) {
      if (pattern.test(normalized)) {
        return {
          shouldRoute: false,
          response: this.generateGreeting(),
          reason: 'greeting'
        };
      }
    }
    
    // === EXTERNAL DATA REQUESTS ===
    const externalDataPatterns = [
      { pattern: /weather (in|for|at)? ?([\w\s]+)/i, type: 'weather' },
      { pattern: /what time is it/i, type: 'time' },
      { pattern: /what'?s? (the )?(date|today'?s? date)/i, type: 'date' },
      { pattern: /^who (is|are) (the )?(president|prime minister)(\s|$)/i, type: 'current_events' }
    ];
    
    for (const { pattern, type } of externalDataPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          shouldRoute: false,
          response: this.generateExternalDataResponse(type, match),
          reason: type
        };
      }
    }
    
    // === SIMPLE CALCULATOR ===
    const mathPattern = /^(what is |calculate |compute )?(\d+\.?\d*)\s*([+\-*/])\s*(\d+\.?\d*)[\s?]*$/;
    const mathMatch = normalized.match(mathPattern);
    if (mathMatch) {
      const [, , num1, op, num2] = mathMatch;
      const result = this.calculate(parseFloat(num1), op, parseFloat(num2));
      return {
        shouldRoute: false,
        response: `${num1} ${op} ${num2} = ${result}`,
        reason: 'calculator'
      };
    }
    
    // === ACKNOWLEDGMENTS ===
    const acknowledgments = [
      'ok', 'cool', 'nice', 'thanks', 'thank you', 'got it',
      'sure', 'yeah', 'yep', 'nope', 'no', 'yes', 'alright'
    ];
    
    if (normalized.split(' ').length <= 2 && acknowledgments.includes(normalized)) {
      return {
        shouldRoute: false,
        response: "Got it! Anything else I can help with?",
        reason: 'acknowledgment'
      };
    }
    
    // === DEFAULT: ROUTE TO AGENT ===
    // Be conservative - when in doubt, use the agent
    return { shouldRoute: true };
  }
  
  private generateGreeting(): string {
    const greetings = [
      "Hello! How can I help you today?",
      "Hi! What would you like to work on?",
      "Hey! What can I do for you?",
      "Hi there! Ready to help when you are."
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  private generateExternalDataResponse(type: string, match: RegExpMatchArray): string {
    switch (type) {
      case 'weather':
        const location = match[2] || 'your location';
        return `I don't have real-time weather access, but you can check current weather in ${location} at weather.com. Want help with something from your knowledge base instead?`;
      
      case 'time':
        return `Current time: ${new Date().toLocaleTimeString()}`;
      
      case 'date':
        return `Today is ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`;
      
      case 'current_events':
        return `I don't have real-time political information. My knowledge was last updated in early 2025. Would you like me to search the web for current information, or help with your saved content?`;
      
      default:
        return "I'm not sure about that. Can you provide more details?";
    }
  }
  
  private calculate(a: number, op: string, b: number): number {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : NaN;
      default: return NaN;
    }
  }
}
