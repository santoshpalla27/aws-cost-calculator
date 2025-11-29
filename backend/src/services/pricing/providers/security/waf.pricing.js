import { BasePricingService } from '../../base.pricing.service.js';
import logger from '../../../../config/logger.config.js';

export class WAFPricingService extends BasePricingService {
  constructor(pricingClient) {
    super(pricingClient, 'WAF');
  }

  getServiceCode() {
    return 'awswaf';
  }

  getSupportedResourceTypes() {
    return [
      'aws_wafv2_web_acl',
      'aws_wafv2_ip_set',
      'aws_wafv2_regex_pattern_set',
      'aws_wafv2_rule_group',
      'aws_waf_web_acl', // Classic WAF
      'aws_waf_rule',
      'aws_wafregional_web_acl'
    ];
  }

  async calculateCost(resource, region) {
    switch (resource.type) {
      case 'aws_wafv2_web_acl':
        return this.calculateWebACLCost(resource, region);
      case 'aws_wafv2_rule_group':
        return this.calculateRuleGroupCost(resource, region);
      default:
        return null;
    }
  }

  async calculateWebACLCost(resource, region) {
    const config = resource.config;
    
    // Web ACL: $5.00 per month
    const webAclCost = 5.00;
    
    // Rules: $1.00 per rule per month
    const rules = config.rule || [];
    const ruleCount = Array.isArray(rules) ? rules.length : 1;
    const ruleCost = ruleCount * 1.00;
    
    // Rule groups: $1.00 per rule per month in the group
    let ruleGroupCost = 0;
    for (const rule of rules) {
      if (rule.statement?.rule_group_reference_statement) {
        // Estimate 10 rules per rule group
        ruleGroupCost += 10 * 1.00;
      }
    }
    
    // Managed rule groups
    let managedRulesCost = 0;
    for (const rule of rules) {
      if (rule.statement?.managed_rule_group_statement) {
        const vendor = rule.statement.managed_rule_group_statement.vendor_name;
        if (vendor === 'AWS') {
          // AWS Managed Rules: $1.00 per rule group
          managedRulesCost += 1.00;
        } else {
          // Third-party Managed Rules: varies, estimate $20
          managedRulesCost += 20.00;
        }
      }
    }
    
    // Request cost: $0.60 per million requests
    const estimatedRequestsMillions = config._estimated_requests_millions || 10;
    const requestCost = estimatedRequestsMillions * 0.60;
    
    // Bot Control (if enabled)
    let botControlCost = 0;
    for (const rule of rules) {
      if (rule.statement?.managed_rule_group_statement?.name?.includes('BotControl')) {
        // $10 per month + $1.00 per million requests inspected
        botControlCost = 10.00 + (estimatedRequestsMillions * 1.00);
      }
    }
    
    // Fraud Control (if enabled)
    let fraudControlCost = 0;
    for (const rule of rules) {
      if (rule.statement?.managed_rule_group_statement?.name?.includes('AccountTakeover') ||
          rule.statement?.managed_rule_group_statement?.name?.includes('AccountCreation')) {
        // $10 per month + analysis fees
        fraudControlCost = 10.00 + (estimatedRequestsMillions * 2.00);
      }
    }
    
    const monthlyCost = webAclCost + ruleCost + ruleGroupCost + managedRulesCost + 
                       requestCost + botControlCost + fraudControlCost;
    const hourly = this.monthlyToHourly(monthlyCost);

    return this.formatCostResponse(hourly, {
      webAcl: this.monthlyToHourly(webAclCost),
      rules: this.monthlyToHourly(ruleCost),
      ruleGroups: this.monthlyToHourly(ruleGroupCost),
      managedRules: this.monthlyToHourly(managedRulesCost),
      requests: this.monthlyToHourly(requestCost),
      botControl: this.monthlyToHourly(botControlCost),
      fraudControl: this.monthlyToHourly(fraudControlCost)
    }, {
      ruleCount,
      estimatedRequestsMillions,
      note: 'WAF costs include web ACL, rules, and request processing'
    });
  }

  async calculateRuleGroupCost(resource, region) {
    const config = resource.config;
    
    // Rule group capacity units: $1.00 per WCU per month
    const capacity = config.capacity || 100;
    const capacityCost = capacity * 0.01; // Approximate $1 per 100 WCU
    
    const hourly = this.monthlyToHourly(capacityCost);

    return this.formatCostResponse(hourly, {
      capacity: hourly
    }, {
      capacity
    });
  }
}