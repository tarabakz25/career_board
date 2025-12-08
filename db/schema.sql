-- PostgreSQL schema for career-board

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  deadline DATE,
  description TEXT,
  created_by INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  applied_job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- seed admin (run manually if not using app bootstrap)
-- insert into users (email, password_hash, salt, role) values (...);
