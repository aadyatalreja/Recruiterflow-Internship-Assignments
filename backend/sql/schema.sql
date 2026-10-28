-- Recruiter Bot schema. 
-- Run with: npm run db:init
-- Hand-written DDL only.

DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS job_culture_keywords;
DROP TABLE IF EXISTS job_required_skills;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS candidate_traits;
DROP TABLE IF EXISTS candidate_skills;
DROP TABLE IF EXISTS candidates;

-- Candidates -------------------------------------------------------------------------------

CREATE TABLE candidates (
  id               INTEGER PRIMARY KEY,
  name             TEXT    NOT NULL UNIQUE CHECK (name <> ''),
  experience_years INTEGER NOT NULL CHECK (experience_years >= 0),
  availability     TEXT    NOT NULL CHECK (availability IN ('immediate', 'two_weeks', 'not_looking')),
  quirk            TEXT
) STRICT;

CREATE TABLE candidate_skills (
  candidate_id INTEGER NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  skill        TEXT    NOT NULL CHECK (skill <> '' AND skill = lower(trim(skill))),
  PRIMARY KEY (candidate_id, skill)
) STRICT;

CREATE TABLE candidate_traits (
  candidate_id INTEGER NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  trait        TEXT    NOT NULL CHECK (trait <> '' AND trait = lower(trim(trait))),
  PRIMARY KEY (candidate_id, trait)
) STRICT;

-- Jobs -------------------------------------------------------------------------------------
CREATE TABLE jobs (
  id             INTEGER PRIMARY KEY,
  title          TEXT    NOT NULL UNIQUE CHECK (title <> ''),
  min_experience INTEGER NOT NULL CHECK (min_experience >= 0),
  tagline        TEXT
) STRICT;

CREATE TABLE job_required_skills (
  job_id INTEGER NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  skill  TEXT    NOT NULL CHECK (skill <> '' AND skill = lower(trim(skill))),
  PRIMARY KEY (job_id, skill)
) STRICT;

CREATE TABLE job_culture_keywords (
  job_id  INTEGER NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  keyword TEXT    NOT NULL CHECK (keyword <> '' AND keyword = lower(trim(keyword))),
  PRIMARY KEY (job_id, keyword)
) STRICT;

CREATE INDEX candidate_skills_by_skill    ON candidate_skills (skill);
CREATE INDEX job_required_skills_by_skill ON job_required_skills (skill);

-- Matches ----------------------------------------------------------------------------------
CREATE TABLE matches (
  candidate_id INTEGER NOT NULL REFERENCES candidates (id) ON DELETE CASCADE,
  job_id       INTEGER NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  score        REAL    NOT NULL CHECK (score BETWEEN 0 AND 100),
  reason       TEXT    NOT NULL CHECK (reason <> ''),
  computed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (candidate_id, job_id)
) STRICT;

CREATE INDEX matches_by_job_score ON matches (job_id, score DESC);
