-- =====================================================
-- AWS DevOps Interview Master - Database Schema
-- PostgreSQL 15+
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUM TYPES
-- =====================================================

CREATE TYPE difficulty_level AS ENUM ('L1', 'L2', 'L3');
CREATE TYPE quiz_category AS ENUM ('aws', 'devops', 'terraform', 'kubernetes', 'docker', 'cicd', 'networking');
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');
CREATE TYPE puzzle_type AS ENUM ('three_tier', 'serverless', 'microservices', 'data_pipeline', 'hybrid_cloud');
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'password_reset');

-- =====================================================
-- ROLES TABLE
-- =====================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for role lookups
CREATE INDEX idx_roles_name ON roles(name);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('user', 'Regular user with quiz access', '["quiz:read", "quiz:attempt", "scenario:read", "scenario:attempt", "puzzle:read", "puzzle:attempt", "leaderboard:read", "profile:read", "profile:update"]'),
('admin', 'Administrator with content management', '["quiz:*", "scenario:*", "puzzle:*", "leaderboard:*", "user:read", "audit:read"]'),
('super_admin', 'Super administrator with full access', '["*"]');

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_username_format CHECK (username ~* '^[a-zA-Z0-9_]{3,50}$')
);

-- Indexes for user lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- =====================================================
-- SESSION TOKENS TABLE
-- =====================================================

CREATE TABLE session_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(512) NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT session_tokens_expires_future CHECK (expires_at > created_at)
);

-- Indexes for session management
CREATE INDEX idx_session_tokens_user_id ON session_tokens(user_id);
CREATE INDEX idx_session_tokens_refresh_token ON session_tokens(refresh_token) WHERE is_revoked = FALSE;
CREATE INDEX idx_session_tokens_expires_at ON session_tokens(expires_at);

-- =====================================================
-- EMAIL VERIFICATION TABLE
-- =====================================================

CREATE TABLE email_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT email_verification_expires_future CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_email_verification_user_id ON email_verification(user_id);
CREATE INDEX idx_email_verification_token ON email_verification(token) WHERE verified_at IS NULL;
CREATE INDEX idx_email_verification_expires ON email_verification(expires_at);

-- =====================================================
-- PASSWORD RESETS TABLE
-- =====================================================

CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT password_resets_expires_future CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token) WHERE used_at IS NULL;
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- =====================================================
-- QUIZZES TABLE
-- =====================================================

CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category quiz_category NOT NULL,
    difficulty difficulty_level NOT NULL DEFAULT 'L1',
    time_limit_seconds INTEGER DEFAULT 1800, -- 30 minutes default
    passing_score INTEGER DEFAULT 70,
    is_active BOOLEAN DEFAULT TRUE,
    is_randomized BOOLEAN DEFAULT TRUE,
    max_attempts INTEGER, -- NULL means unlimited
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT quizzes_time_limit_positive CHECK (time_limit_seconds > 0),
    CONSTRAINT quizzes_passing_score_valid CHECK (passing_score BETWEEN 0 AND 100)
);

-- Indexes for quiz queries
CREATE INDEX idx_quizzes_category ON quizzes(category);
CREATE INDEX idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX idx_quizzes_is_active ON quizzes(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_quizzes_tags ON quizzes USING GIN(tags);
CREATE INDEX idx_quizzes_created_at ON quizzes(created_at DESC);
CREATE INDEX idx_quizzes_category_difficulty ON quizzes(category, difficulty) WHERE is_active = TRUE;

-- =====================================================
-- QUIZ OPTIONS (QUESTIONS) TABLE
-- =====================================================

CREATE TABLE quiz_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_order INTEGER NOT NULL DEFAULT 0,
    options JSONB NOT NULL, -- Array of {id, text, is_correct}
    correct_option_ids UUID[] NOT NULL,
    explanation TEXT NOT NULL,
    hint TEXT,
    difficulty difficulty_level NOT NULL DEFAULT 'L1',
    tags TEXT[] DEFAULT '{}',
    time_limit_seconds INTEGER, -- Per-question time limit (optional)
    points INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT quiz_options_points_positive CHECK (points > 0),
    CONSTRAINT quiz_options_has_options CHECK (jsonb_array_length(options) >= 2),
    CONSTRAINT quiz_options_has_correct CHECK (array_length(correct_option_ids, 1) >= 1)
);

-- Indexes
CREATE INDEX idx_quiz_options_quiz_id ON quiz_options(quiz_id);
CREATE INDEX idx_quiz_options_difficulty ON quiz_options(difficulty);
CREATE INDEX idx_quiz_options_is_active ON quiz_options(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_quiz_options_tags ON quiz_options USING GIN(tags);
CREATE INDEX idx_quiz_options_order ON quiz_options(quiz_id, question_order);

-- =====================================================
-- QUIZ ATTEMPTS TABLE
-- =====================================================

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    answers JSONB NOT NULL DEFAULT '[]', -- Array of {question_id, selected_ids, is_correct, time_spent}
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, abandoned
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    
    CONSTRAINT quiz_attempts_score_valid CHECK (score >= 0),
    CONSTRAINT quiz_attempts_percentage_valid CHECK (percentage BETWEEN 0 AND 100),
    CONSTRAINT quiz_attempts_status_valid CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Indexes
CREATE INDEX idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user_quiz ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_attempts_status ON quiz_attempts(status);
CREATE INDEX idx_quiz_attempts_completed_at ON quiz_attempts(completed_at DESC) WHERE status = 'completed';
CREATE INDEX idx_quiz_attempts_score ON quiz_attempts(score DESC) WHERE status = 'completed';

-- =====================================================
-- SCENARIO QUESTIONS TABLE
-- =====================================================

CREATE TABLE scenario_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category quiz_category NOT NULL,
    difficulty difficulty_level NOT NULL DEFAULT 'L2',
    symptoms JSONB NOT NULL, -- Array of symptom descriptions
    logs TEXT, -- Simulated log output
    context JSONB DEFAULT '{}', -- Additional context (architecture, config, etc.)
    environment JSONB DEFAULT '{}', -- Environment details (AWS region, services, etc.)
    correct_resolution_steps UUID[] NOT NULL,
    explanation TEXT NOT NULL,
    learning_points TEXT[] DEFAULT '{}',
    related_docs TEXT[] DEFAULT '{}', -- Links to AWS/DevOps documentation
    time_limit_seconds INTEGER DEFAULT 900, -- 15 minutes default
    max_attempts INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_scenario_questions_category ON scenario_questions(category);
CREATE INDEX idx_scenario_questions_difficulty ON scenario_questions(difficulty);
CREATE INDEX idx_scenario_questions_is_active ON scenario_questions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_scenario_questions_tags ON scenario_questions USING GIN(tags);
CREATE INDEX idx_scenario_questions_created_at ON scenario_questions(created_at DESC);

-- =====================================================
-- SCENARIO STEPS TABLE
-- =====================================================

CREATE TABLE scenario_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES scenario_questions(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    action_text TEXT NOT NULL,
    action_command TEXT, -- CLI command if applicable
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    feedback_correct TEXT,
    feedback_incorrect TEXT,
    partial_credit DECIMAL(3,2) DEFAULT 0, -- 0 to 1 for partial correctness
    leads_to_step_id UUID REFERENCES scenario_steps(id), -- For branching scenarios
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT scenario_steps_order_positive CHECK (step_order >= 0),
    CONSTRAINT scenario_steps_partial_credit_valid CHECK (partial_credit BETWEEN 0 AND 1)
);

-- Indexes
CREATE INDEX idx_scenario_steps_scenario_id ON scenario_steps(scenario_id);
CREATE INDEX idx_scenario_steps_order ON scenario_steps(scenario_id, step_order);
CREATE INDEX idx_scenario_steps_is_correct ON scenario_steps(is_correct) WHERE is_correct = TRUE;

-- =====================================================
-- SCENARIO EVALUATIONS TABLE
-- =====================================================

CREATE TABLE scenario_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scenario_id UUID NOT NULL REFERENCES scenario_questions(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    steps_taken JSONB NOT NULL DEFAULT '[]', -- Array of {step_id, selected_at, is_correct}
    correct_steps INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL,
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    feedback TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT scenario_evaluations_percentage_valid CHECK (percentage BETWEEN 0 AND 100),
    CONSTRAINT scenario_evaluations_status_valid CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Indexes
CREATE INDEX idx_scenario_evaluations_user_id ON scenario_evaluations(user_id);
CREATE INDEX idx_scenario_evaluations_scenario_id ON scenario_evaluations(scenario_id);
CREATE INDEX idx_scenario_evaluations_user_scenario ON scenario_evaluations(user_id, scenario_id);
CREATE INDEX idx_scenario_evaluations_status ON scenario_evaluations(status);
CREATE INDEX idx_scenario_evaluations_completed ON scenario_evaluations(completed_at DESC) WHERE status = 'completed';

-- =====================================================
-- AWS ARCHITECTURE PUZZLES TABLE
-- =====================================================

CREATE TABLE aws_architecture_puzzles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    puzzle_type puzzle_type NOT NULL,
    difficulty difficulty_level NOT NULL DEFAULT 'L2',
    target_architecture JSONB NOT NULL, -- Complete target architecture definition
    requirements TEXT[] NOT NULL, -- List of requirements the architecture must meet
    hints TEXT[] DEFAULT '{}',
    time_limit_seconds INTEGER DEFAULT 1200, -- 20 minutes default
    max_attempts INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_aws_puzzles_puzzle_type ON aws_architecture_puzzles(puzzle_type);
CREATE INDEX idx_aws_puzzles_difficulty ON aws_architecture_puzzles(difficulty);
CREATE INDEX idx_aws_puzzles_is_active ON aws_architecture_puzzles(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_aws_puzzles_tags ON aws_architecture_puzzles USING GIN(tags);

-- =====================================================
-- PUZZLE ITEMS TABLE
-- =====================================================

CREATE TABLE puzzle_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    puzzle_id UUID NOT NULL REFERENCES aws_architecture_puzzles(id) ON DELETE CASCADE,
    component_type VARCHAR(100) NOT NULL, -- e.g., 'ec2', 'rds', 'alb', 'vpc', 'subnet'
    component_name VARCHAR(255),
    expected_position JSONB NOT NULL, -- {x, y, zone, layer}
    expected_connections JSONB DEFAULT '[]', -- Array of {target_item_id, connection_type}
    properties JSONB DEFAULT '{}', -- Component-specific properties
    is_required BOOLEAN DEFAULT TRUE,
    is_provided BOOLEAN DEFAULT FALSE, -- If true, this component is pre-placed
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_puzzle_items_puzzle_id ON puzzle_items(puzzle_id);
CREATE INDEX idx_puzzle_items_component_type ON puzzle_items(component_type);
CREATE INDEX idx_puzzle_items_is_required ON puzzle_items(is_required) WHERE is_required = TRUE;

-- =====================================================
-- PUZZLE ATTEMPTS TABLE
-- =====================================================

CREATE TABLE puzzle_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    puzzle_id UUID NOT NULL REFERENCES aws_architecture_puzzles(id) ON DELETE CASCADE,
    submitted_architecture JSONB NOT NULL, -- User's submitted architecture
    score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    correct_components INTEGER DEFAULT 0,
    correct_connections INTEGER DEFAULT 0,
    missing_components TEXT[] DEFAULT '{}',
    incorrect_connections TEXT[] DEFAULT '{}',
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in_progress',
    feedback JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT puzzle_attempts_percentage_valid CHECK (percentage BETWEEN 0 AND 100),
    CONSTRAINT puzzle_attempts_status_valid CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Indexes
CREATE INDEX idx_puzzle_attempts_user_id ON puzzle_attempts(user_id);
CREATE INDEX idx_puzzle_attempts_puzzle_id ON puzzle_attempts(puzzle_id);
CREATE INDEX idx_puzzle_attempts_user_puzzle ON puzzle_attempts(user_id, puzzle_id);
CREATE INDEX idx_puzzle_attempts_status ON puzzle_attempts(status);
CREATE INDEX idx_puzzle_attempts_score ON puzzle_attempts(score DESC) WHERE status = 'completed';

-- =====================================================
-- LEADERBOARD TABLE
-- =====================================================

CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category quiz_category,
    total_score INTEGER NOT NULL DEFAULT 0,
    quizzes_completed INTEGER NOT NULL DEFAULT 0,
    scenarios_completed INTEGER NOT NULL DEFAULT 0,
    puzzles_completed INTEGER NOT NULL DEFAULT 0,
    total_correct_answers INTEGER NOT NULL DEFAULT 0,
    total_questions_attempted INTEGER NOT NULL DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    average_time_seconds INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    rank INTEGER,
    period VARCHAR(20) DEFAULT 'all_time', -- daily, weekly, monthly, all_time
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT leaderboard_scores_positive CHECK (total_score >= 0),
    CONSTRAINT leaderboard_period_valid CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
    CONSTRAINT leaderboard_unique_user_category_period UNIQUE (user_id, category, period)
);

-- Indexes
CREATE INDEX idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX idx_leaderboard_category ON leaderboard(category);
CREATE INDEX idx_leaderboard_total_score ON leaderboard(total_score DESC);
CREATE INDEX idx_leaderboard_rank ON leaderboard(rank) WHERE rank IS NOT NULL;
CREATE INDEX idx_leaderboard_period ON leaderboard(period);
CREATE INDEX idx_leaderboard_category_period_score ON leaderboard(category, period, total_score DESC);

-- =====================================================
-- ADMIN AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'quiz', 'scenario', 'puzzle', 'user', etc.
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    additional_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin_action ON admin_audit_logs(admin_id, action, created_at DESC);

-- =====================================================
-- USER STATISTICS TABLE (Denormalized for performance)
-- =====================================================

CREATE TABLE user_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    total_quizzes_attempted INTEGER DEFAULT 0,
    total_quizzes_completed INTEGER DEFAULT 0,
    total_scenarios_attempted INTEGER DEFAULT 0,
    total_scenarios_completed INTEGER DEFAULT 0,
    total_puzzles_attempted INTEGER DEFAULT 0,
    total_puzzles_completed INTEGER DEFAULT 0,
    total_time_spent_seconds INTEGER DEFAULT 0,
    highest_quiz_score INTEGER DEFAULT 0,
    highest_scenario_score INTEGER DEFAULT 0,
    highest_puzzle_score INTEGER DEFAULT 0,
    badges_earned JSONB DEFAULT '[]',
    achievements JSONB DEFAULT '[]',
    skill_levels JSONB DEFAULT '{}', -- {category: level}
    last_activity_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX idx_user_statistics_user_id ON user_statistics(user_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
    BEFORE UPDATE ON quizzes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_options_updated_at
    BEFORE UPDATE ON quiz_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenario_questions_updated_at
    BEFORE UPDATE ON scenario_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aws_puzzles_updated_at
    BEFORE UPDATE ON aws_architecture_puzzles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at
    BEFORE UPDATE ON leaderboard
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at
    BEFORE UPDATE ON user_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update leaderboard after quiz completion
CREATE OR REPLACE FUNCTION update_leaderboard_on_quiz_completion()
RETURNS TRIGGER AS $$
DECLARE
    quiz_category quiz_category;
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Get quiz category
        SELECT category INTO quiz_category FROM quizzes WHERE id = NEW.quiz_id;
        
        -- Update or insert leaderboard entry
        INSERT INTO leaderboard (user_id, category, total_score, quizzes_completed, period)
        VALUES (NEW.user_id, quiz_category, NEW.score, 1, 'all_time')
        ON CONFLICT (user_id, category, period)
        DO UPDATE SET
            total_score = leaderboard.total_score + NEW.score,
            quizzes_completed = leaderboard.quizzes_completed + 1,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_leaderboard_quiz
    AFTER INSERT OR UPDATE ON quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_leaderboard_on_quiz_completion();

-- Function to create user statistics on user creation
CREATE OR REPLACE FUNCTION create_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_statistics (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_create_user_statistics
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_statistics();

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM session_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    DELETE FROM email_verification WHERE expires_at < CURRENT_TIMESTAMP AND verified_at IS NULL;
    DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP AND used_at IS NULL;
END;
$$ language 'plpgsql';

-- =====================================================
-- VIEWS
-- =====================================================

-- View for user quiz performance
CREATE OR REPLACE VIEW user_quiz_performance AS
SELECT 
    u.id as user_id,
    u.username,
    q.category,
    q.difficulty,
    COUNT(qa.id) as attempts,
    AVG(qa.percentage) as avg_score,
    MAX(qa.percentage) as best_score,
    AVG(qa.time_taken_seconds) as avg_time
FROM users u
JOIN quiz_attempts qa ON u.id = qa.user_id
JOIN quizzes q ON qa.quiz_id = q.id
WHERE qa.status = 'completed'
GROUP BY u.id, u.username, q.category, q.difficulty;

-- View for leaderboard with user details
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
    l.*,
    u.username,
    u.avatar_url,
    RANK() OVER (PARTITION BY l.category, l.period ORDER BY l.total_score DESC) as calculated_rank
FROM leaderboard l
JOIN users u ON l.user_id = u.id
WHERE u.is_active = TRUE;

-- =====================================================
-- GRANTS (adjust based on your database user setup)
-- =====================================================

-- Example grants (uncomment and modify as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;