/**
 * Database Seeder
 * Populates the database with initial data
 */

const { pool, query } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const awsQuestions = require('./data/aws-questions.json');
const devopsQuestions = require('./data/devops-questions.json');
const scenarios = require('./data/scenarios.json');
const puzzles = require('./data/puzzles.json');

const SALT_ROUNDS = 12;

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // Seed admin user
    console.log('Creating admin user...');
    const adminRole = await query(`SELECT id FROM roles WHERE name = 'admin'`);
    const adminPasswordHash = await bcrypt.hash('Admin@123!', SALT_ROUNDS);
    
    await query(`
      INSERT INTO users (id, email, username, password_hash, first_name, last_name, role_id, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (email) DO NOTHING
    `, [uuidv4(), 'admin@interviewmaster.com', 'admin', adminPasswordHash, 'System', 'Admin', adminRole.rows[0].id]);

    // Seed AWS quizzes
    console.log('Seeding AWS quizzes...');
    await seedQuizzes(awsQuestions, 'aws');

    // Seed DevOps quizzes
    console.log('Seeding DevOps quizzes...');
    await seedQuizzes(devopsQuestions, 'devops');

    // Seed scenarios
    console.log('Seeding scenarios...');
    await seedScenarios(scenarios);

    // Seed puzzles
    console.log('Seeding puzzles...');
    await seedPuzzles(puzzles);

    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

async function seedQuizzes(questionsData, category) {
  for (const quizData of questionsData.quizzes) {
    const quizId = uuidv4();
    
    await query(`
      INSERT INTO quizzes (id, title, description, category, difficulty, time_limit_seconds, passing_score, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING
    `, [
      quizId,
      quizData.title,
      quizData.description,
      category,
      quizData.difficulty,
      quizData.timeLimit || 1800,
      quizData.passingScore || 70,
      quizData.tags || []
    ]);

    for (let i = 0; i < quizData.questions.length; i++) {
      const q = quizData.questions[i];
      const questionId = uuidv4();
      
      const options = q.options.map((opt, idx) => ({
        id: uuidv4(),
        text: opt.text,
        isCorrect: opt.isCorrect
      }));

      const correctOptionIds = options.filter(o => o.isCorrect).map(o => o.id);

      await query(`
        INSERT INTO quiz_options (id, quiz_id, question_text, question_order, options, correct_option_ids, explanation, difficulty, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        questionId,
        quizId,
        q.questionText,
        i,
        JSON.stringify(options),
        correctOptionIds,
        q.explanation,
        q.difficulty || quizData.difficulty,
        q.tags || []
      ]);
    }
  }
}

async function seedScenarios(scenariosData) {
  for (const scenario of scenariosData.scenarios) {
    const scenarioId = uuidv4();

    await query(`
      INSERT INTO scenario_questions (id, title, description, category, difficulty, symptoms, logs, context, explanation, learning_points, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      scenarioId,
      scenario.title,
      scenario.description,
      scenario.category,
      scenario.difficulty,
      JSON.stringify(scenario.symptoms),
      scenario.logs,
      JSON.stringify(scenario.context || {}),
      scenario.explanation,
      scenario.learningPoints || [],
      scenario.tags || []
    ]);

    const correctStepIds = [];

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepId = uuidv4();

      if (step.isCorrect) {
        correctStepIds.push(stepId);
      }

      await query(`
        INSERT INTO scenario_steps (id, scenario_id, step_order, action_text, action_command, is_correct, feedback_correct, feedback_incorrect)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        stepId,
        scenarioId,
        i,
        step.actionText,
        step.actionCommand,
        step.isCorrect,
        step.feedbackCorrect,
        step.feedbackIncorrect
      ]);
    }

    // Update correct steps
    await query(`
      UPDATE scenario_questions SET correct_resolution_steps = $1 WHERE id = $2
    `, [correctStepIds, scenarioId]);
  }
}

async function seedPuzzles(puzzlesData) {
  for (const puzzle of puzzlesData.puzzles) {
    const puzzleId = uuidv4();

    await query(`
      INSERT INTO aws_architecture_puzzles (id, title, description, puzzle_type, difficulty, target_architecture, requirements, hints, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      puzzleId,
      puzzle.title,
      puzzle.description,
      puzzle.puzzleType,
      puzzle.difficulty,
      JSON.stringify(puzzle.targetArchitecture),
      puzzle.requirements,
      puzzle.hints || [],
      puzzle.tags || []
    ]);

    for (const item of puzzle.components) {
      await query(`
        INSERT INTO puzzle_items (id, puzzle_id, component_type, component_name, expected_position, expected_connections, is_required, is_provided)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        uuidv4(),
        puzzleId,
        item.componentType,
        item.componentName,
        JSON.stringify(item.expectedPosition),
        JSON.stringify(item.expectedConnections || []),
        item.isRequired !== false,
        item.isProvided || false
      ]);
    }
  }
}

// Run seeder
seed()
  .then(() => {
    console.log('Seeding complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });