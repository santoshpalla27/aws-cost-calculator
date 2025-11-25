/**
 * Architecture Puzzle Evaluation Engine
 * Evaluates user-submitted AWS architecture diagrams
 */

const puzzleRepository = require('../repositories/puzzle.repository');
const { calculatePercentage } = require('../utils/helpers');
const logger = require('../utils/logger');

const puzzleEngine = {
  /**
   * Evaluate submitted architecture
   * @param {string} puzzleId - Puzzle ID
   * @param {Object} submission - User's submitted architecture
   * @returns {Object} Evaluation result
   */
  async evaluatePuzzle(puzzleId, submission) {
    const puzzle = await puzzleRepository.findById(puzzleId);
    if (!puzzle) {
      throw new Error('Puzzle not found');
    }

    const expectedItems = await puzzleRepository.getItems(puzzleId);
    const targetArch = puzzle.target_architecture;

    // Evaluate components
    const componentEval = this.evaluateComponents(
      submission.components,
      expectedItems
    );

    // Evaluate connections
    const connectionEval = this.evaluateConnections(
      submission.connections,
      expectedItems
    );

    // Calculate overall score
    const componentWeight = 0.6; // 60% for correct components
    const connectionWeight = 0.4; // 40% for correct connections

    const totalScore = 
      (componentEval.score * componentWeight) +
      (connectionEval.score * connectionWeight);

    const percentage = calculatePercentage(totalScore, 1) ;

    // Generate feedback
    const feedback = this.generateFeedback(
      componentEval,
      connectionEval,
      puzzle.requirements
    );

    return {
      score: Math.round(totalScore * 100),
      maxScore: 100,
      percentage,
      componentScore: Math.round(componentEval.score * 100),
      connectionScore: Math.round(connectionEval.score * 100),
      correctComponents: componentEval.correct,
      missingComponents: componentEval.missing,
      extraComponents: componentEval.extra,
      correctConnections: connectionEval.correct,
      missingConnections: connectionEval.missing,
      incorrectConnections: connectionEval.incorrect,
      feedback,
      requirementsMet: this.checkRequirements(submission, puzzle.requirements),
    };
  },

  /**
   * Evaluate component placement
   */
  evaluateComponents(submittedComponents, expectedItems) {
    const requiredItems = expectedItems.filter((item) => item.is_required);
    const optionalItems = expectedItems.filter((item) => !item.is_required);

    const correct = [];
    const missing = [];
    const extra = [];
    const positionErrors = [];

    // Check for required components
    for (const expected of requiredItems) {
      const submitted = submittedComponents.find(
        (c) => c.itemId === expected.id || 
               this.matchesComponentType(c, expected)
      );

      if (submitted) {
        const positionCorrect = this.checkPosition(
          submitted.position,
          expected.expected_position
        );

        correct.push({
          itemId: expected.id,
          componentType: expected.component_type,
          positionCorrect,
        });

        if (!positionCorrect) {
          positionErrors.push({
            itemId: expected.id,
            expected: expected.expected_position,
            actual: submitted.position,
          });
        }
      } else {
        missing.push({
          itemId: expected.id,
          componentType: expected.component_type,
          componentName: expected.component_name,
        });
      }
    }

    // Check for extra components (not required)
    for (const submitted of submittedComponents) {
      const isExpected = expectedItems.some(
        (e) => e.id === submitted.itemId || 
               this.matchesComponentType(submitted, e)
      );

      if (!isExpected) {
        extra.push({
          componentType: submitted.componentType,
          position: submitted.position,
        });
      }
    }

    // Calculate score
    const requiredCount = requiredItems.length;
    const correctCount = correct.length;
    const positionCorrectCount = correct.filter((c) => c.positionCorrect).length;

    // Score: 70% for having components, 30% for correct positioning
    const presenceScore = requiredCount > 0 ? correctCount / requiredCount : 1;
    const positionScore = correctCount > 0 ? positionCorrectCount / correctCount : 0;
    const score = (presenceScore * 0.7) + (positionScore * 0.3);

    return {
      score,
      correct,
      missing,
      extra,
      positionErrors,
    };
  },

  /**
   * Evaluate connections between components
   */
  evaluateConnections(submittedConnections, expectedItems) {
    // Build expected connections map
    const expectedConnections = [];
    for (const item of expectedItems) {
      const connections = item.expected_connections || [];
      for (const conn of connections) {
        expectedConnections.push({
          from: item.id,
          to: conn.targetItemId,
          type: conn.connectionType,
        });
      }
    }

    const correct = [];
    const missing = [];
    const incorrect = [];

    // Check expected connections
    for (const expected of expectedConnections) {
      const found = submittedConnections.find(
        (c) => this.connectionsMatch(c, expected)
      );

      if (found) {
        correct.push(expected);
      } else {
        missing.push(expected);
      }
    }

    // Check for incorrect connections
    for (const submitted of submittedConnections) {
      const isExpected = expectedConnections.some(
        (e) => this.connectionsMatch(submitted, e)
      );

      if (!isExpected) {
        incorrect.push(submitted);
      }
    }

    // Calculate score
    const totalExpected = expectedConnections.length;
    const correctCount = correct.length;
    const incorrectPenalty = incorrect.length * 0.1; // 10% penalty per wrong connection

    const score = totalExpected > 0
      ? Math.max(0, (correctCount / totalExpected) - incorrectPenalty)
      : 1;

    return {
      score,
      correct,
      missing,
      incorrect,
    };
  },

  /**
   * Check if component types match
   */
  matchesComponentType(submitted, expected) {
    return submitted.componentType?.toLowerCase() === 
           expected.component_type?.toLowerCase();
  },

  /**
   * Check if position is correct (with tolerance)
   */
  checkPosition(actual, expected, tolerance = 50) {
    if (!actual || !expected) return false;

    // Check zone/layer if specified
    if (expected.zone && actual.zone !== expected.zone) return false;
    if (expected.layer && actual.layer !== expected.layer) return false;

    // Check x,y with tolerance
    const xDiff = Math.abs((actual.x || 0) - (expected.x || 0));
    const yDiff = Math.abs((actual.y || 0) - (expected.y || 0));

    return xDiff <= tolerance && yDiff <= tolerance;
  },

  /**
   * Check if two connections match
   */
  connectionsMatch(conn1, conn2) {
    // Check both directions for undirected connections
    const directMatch = 
      conn1.fromItemId === conn2.from &&
      conn1.toItemId === conn2.to;

    const reverseMatch =
      conn1.fromItemId === conn2.to &&
      conn1.toItemId === conn2.from;

    const typeMatch = !conn2.type || 
      conn1.connectionType?.toLowerCase() === conn2.type?.toLowerCase();

    return (directMatch || reverseMatch) && typeMatch;
  },

  /**
   * Check if requirements are met
   */
  checkRequirements(submission, requirements) {
    if (!requirements || requirements.length === 0) {
      return { allMet: true, details: [] };
    }

    const details = requirements.map((req) => {
      // Parse requirement and check
      // This is simplified - real implementation would be more sophisticated
      const met = this.checkSingleRequirement(submission, req);
      return {
        requirement: req,
        met,
      };
    });

    return {
      allMet: details.every((d) => d.met),
      details,
    };
  },

  /**
   * Check a single requirement
   */
  checkSingleRequirement(submission, requirement) {
    // Simplified requirement checking
    const reqLower = requirement.toLowerCase();

    // Check for component presence requirements
    const componentKeywords = {
      'load balancer': ['alb', 'elb', 'nlb', 'load_balancer'],
      'database': ['rds', 'aurora', 'dynamodb', 'database'],
      'compute': ['ec2', 'ecs', 'eks', 'lambda', 'fargate'],
      'vpc': ['vpc'],
      'subnet': ['subnet'],
      'security group': ['security_group', 'sg'],
    };

    for (const [key, values] of Object.entries(componentKeywords)) {
      if (reqLower.includes(key)) {
        const hasComponent = submission.components.some((c) =>
          values.some((v) => c.componentType?.toLowerCase().includes(v))
        );
        if (!hasComponent) return false;
      }
    }

    return true;
  },

  /**
   * Generate detailed feedback
   */
  generateFeedback(componentEval, connectionEval, requirements) {
    const feedback = {
      overall: '',
      components: [],
      connections: [],
      suggestions: [],
    };

    // Overall feedback
    const overallScore = (componentEval.score + connectionEval.score) / 2;
    if (overallScore >= 0.9) {
      feedback.overall = 'Excellent! Your architecture is well-designed.';
    } else if (overallScore >= 0.7) {
      feedback.overall = 'Good job! Minor improvements needed.';
    } else if (overallScore >= 0.5) {
      feedback.overall = 'Fair attempt. Review the missing components.';
    } else {
      feedback.overall = 'Needs work. Study the target architecture carefully.';
    }

    // Component feedback
    if (componentEval.missing.length > 0) {
      feedback.components.push(
        `Missing ${componentEval.missing.length} required component(s): ` +
        componentEval.missing.map((m) => m.componentType).join(', ')
      );
    }

    if (componentEval.extra.length > 0) {
      feedback.components.push(
        `${componentEval.extra.length} unnecessary component(s) added`
      );
    }

    if (componentEval.positionErrors.length > 0) {
      feedback.components.push(
        `${componentEval.positionErrors.length} component(s) in wrong position`
      );
    }

    // Connection feedback
    if (connectionEval.missing.length > 0) {
      feedback.connections.push(
        `Missing ${connectionEval.missing.length} connection(s)`
      );
    }

    if (connectionEval.incorrect.length > 0) {
      feedback.connections.push(
        `${connectionEval.incorrect.length} incorrect connection(s)`
      );
    }

    // Suggestions
    if (componentEval.missing.length > 0) {
      feedback.suggestions.push(
        'Review AWS best practices for the architecture type'
      );
    }

    if (connectionEval.missing.length > 0) {
      feedback.suggestions.push(
        'Ensure all components are properly connected'
      );
    }

    return feedback;
  },

  /**
   * Get available AWS components for puzzle builder
   */
  getAvailableComponents() {
    return [
      // Compute
      { type: 'ec2', name: 'EC2 Instance', category: 'compute', icon: '/icons/aws/ec2.svg' },
      { type: 'lambda', name: 'Lambda Function', category: 'compute', icon: '/icons/aws/lambda.svg' },
      { type: 'ecs', name: 'ECS Cluster', category: 'compute', icon: '/icons/aws/ecs.svg' },
      { type: 'eks', name: 'EKS Cluster', category: 'compute', icon: '/icons/aws/eks.svg' },
      { type: 'fargate', name: 'Fargate', category: 'compute', icon: '/icons/aws/fargate.svg' },
      
      // Database
      { type: 'rds', name: 'RDS Database', category: 'database', icon: '/icons/aws/rds.svg' },
      { type: 'aurora', name: 'Aurora', category: 'database', icon: '/icons_aws/aurora.svg' },
      { type: 'dynamodb', name: 'DynamoDB', category: 'database', icon: '/icons/aws/dynamodb.svg' },
      { type: 'elasticache', name: 'ElastiCache', category: 'database', icon: '/icons/aws/elasticache.svg' },
      
      // Networking
      { type: 'vpc', name: 'VPC', category: 'networking', icon: '/icons/aws/vpc.svg' },
      { type: 'subnet', name: 'Subnet', category: 'networking', icon: '/icons/aws/subnet.svg' },
      { type: 'igw', name: 'Internet Gateway', category: 'networking', icon: '/icons/aws/igw.svg' },
      { type: 'nat', name: 'NAT Gateway', category: 'networking', icon: '/icons/aws/nat.svg' },
      { type: 'alb', name: 'Application Load Balancer', category: 'networking', icon: '/icons/aws/alb.svg' },
      { type: 'nlb', name: 'Network Load Balancer', category: 'networking', icon: '/icons/aws/nlb.svg' },
      { type: 'route53', name: 'Route 53', category: 'networking', icon: '/icons/aws/route53.svg' },
      { type: 'cloudfront', name: 'CloudFront', category: 'networking', icon: '/icons/aws/cloudfront.svg' },
      
      // Security
      { type: 'security_group', name: 'Security Group', category: 'security', icon: '/icons/aws/sg.svg' },
      { type: 'iam', name: 'IAM Role', category: 'security', icon: '/icons/aws/iam.svg' },
      { type: 'waf', name: 'WAF', category: 'security', icon: '/icons/aws/waf.svg' },
      { type: 'kms', name: 'KMS', category: 'security', icon: '/icons/aws/kms.svg' },
      
      // Storage
      { type: 's3', name: 'S3 Bucket', category: 'storage', icon: '/icons/aws/s3.svg' },
      { type: 'efs', name: 'EFS', category: 'storage', icon: '/icons/aws/efs.svg' },
      { type: 'ebs', name: 'EBS Volume', category: 'storage', icon: '/icons/aws/ebs.svg' },
      
      // Messaging
      { type: 'sqs', name: 'SQS Queue', category: 'messaging', icon: '/icons/aws/sqs.svg' },
      { type: 'sns', name: 'SNS Topic', category: 'messaging', icon: '/icons/aws/sns.svg' },
      { type: 'eventbridge', name: 'EventBridge', category: 'messaging', icon: '/icons/aws/eventbridge.svg' },
      
      // Monitoring
      { type: 'cloudwatch', name: 'CloudWatch', category: 'monitoring', icon: '/icons/aws/cloudwatch.svg' },
      { type: 'xray', name: 'X-Ray', category: 'monitoring', icon: '/icons/aws/xray.svg' },
    ];
  },

  /**
   * Get connection types
   */
  getConnectionTypes() {
    return [
      { type: 'network', name: 'Network Connection', style: 'solid' },
      { type: 'data', name: 'Data Flow', style: 'dashed' },
      { type: 'security', name: 'Security Association', style: 'dotted' },
      { type: 'dns', name: 'DNS Resolution', style: 'wavy' },
    ];
  },
};

module.exports = puzzleEngine;