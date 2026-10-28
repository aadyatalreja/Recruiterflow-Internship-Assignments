------------------------------------------------------------------------------------------------------------
---------------------------------  SQL Detective (Part 2)     ----------------------------------------------
------------------------------------------------------------------------------------------------------------

-- Dataset Schema ----------------------------------------------------------------------
DROP TABLE IF EXISTS interviews;
DROP TABLE IF EXISTS applicants;
DROP TABLE IF EXISTS job_postings;
DROP TABLE IF EXISTS recruiters;

CREATE TABLE recruiters (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  region VARCHAR(50)
);

CREATE TABLE job_postings (
  id INT PRIMARY KEY,
  title VARCHAR(100),
  recruiter_id INT,
  department VARCHAR(50),
  opened_date DATE,
  status VARCHAR(20) -- 'open', 'closed', 'on_hold'
);

CREATE TABLE applicants (
  id INT PRIMARY KEY,
  full_name VARCHAR(100),
  email VARCHAR(100),
  source VARCHAR(50), -- nullable
  applied_date DATE
);

CREATE TABLE interviews (
  id INT PRIMARY KEY,
  applicant_id INT,
  job_posting_id INT,
  stage VARCHAR(20), -- 'Screen', 'Technical', 'Final'
  scheduled_date DATE,
  outcome VARCHAR(20) -- 'passed', 'failed', 'no_show', NULL (pending)
);

-- Seed Data ----------------------------------------------------------------------
INSERT INTO recruiters VALUES
  (1, 'Priya Shah', 'APAC'),
  (2, 'Daniel Ortiz', 'NA'),
  (3, 'Fatima Al-Sayed', 'EMEA'),
  (4, 'Wei Zhang', 'APAC'),
  (5, 'Grace Okafor', 'EMEA');

INSERT INTO job_postings VALUES
  (1, 'Backend Engineer I', 1, 'Engineering', '2026-01-05', 'open'),
  (2, 'Backend Engineer I', 2, 'Engineering', '2026-01-10', 'open'),
  (3, 'Data Analyst', 3, 'Data', '2026-01-08', 'closed'),
  (4, 'Backend Engineer II', 1, 'Engineering', '2026-02-01', 'open'),
  (5, 'DevOps Engineer', 4, 'Infrastructure', '2026-01-20', 'open'),
  (6, 'Data Analyst', 5, 'Data', '2026-02-05', 'on_hold'),
  (7, 'Backend Engineer I', 2, 'Engineering', '2026-02-15', 'closed');

INSERT INTO applicants VALUES
  (1, 'Ananya Rao', 'ananya.rao@mail.com', 'LinkedIn', '2026-01-06'),
  (2, 'Ananya Rao', 'Ananya.Rao@mail.com', 'Referral', '2026-02-04'),
  (3, 'Ben Turner', 'ben.turner@mail.com', 'Job Board', '2026-01-07'),
  (4, 'Chloe Martin', 'chloe.martin@mail.com', NULL, '2026-01-09'),
  (5, 'Devansh Patel', 'devansh.patel@mail.com', 'LinkedIn', '2026-01-11'),
  (6, 'Elena Popescu', 'elena.popescu@mail.com', 'Referral', '2026-01-12'),
  (7, 'Farid Haidari', 'farid.haidari@mail.com', 'Job Board', '2026-01-13'),
  (8, 'Grace Lin', 'grace.lin@mail.com', 'LinkedIn', '2026-01-15'),
  (9, 'Hassan Malik', 'hassan.malik@mail.com', NULL, '2026-01-16'),
  (10, 'Isla Fraser', 'isla.fraser@mail.com', 'Referral', '2026-01-18'),
  (11, 'Jonas Weber', 'jonas.weber@mail.com', 'Job Board', '2026-02-10');

INSERT INTO interviews VALUES
  (1, 1, 1, 'Screen', '2026-01-10', 'passed'),
  (2, 1, 1, 'Technical', '2026-01-15', 'passed'),
  (3, 1, 1, 'Final', '2026-01-22', 'passed'),
  (4, 2, 4, 'Screen', '2026-02-05', 'passed'),
  (5, 3, 1, 'Screen', '2026-01-11', 'passed'),
  (6, 3, 1, 'Technical', '2026-01-16', 'failed'),
  (7, 3, 3, 'Final', '2026-01-28', 'passed'),
  (8, 4, 1, 'Screen', '2026-01-12', 'passed'),
  (9, 4, 1, 'Final', '2026-01-24', 'failed'),
  (10, 5, 2, 'Screen', '2026-01-14', 'passed'),
  (11, 5, 2, 'Technical', '2026-01-19', 'passed'),
  (12, 5, 2, 'Final', '2026-01-25', 'passed'),
  (13, 6, 2, 'Screen', '2026-01-15', 'passed'),
  (14, 6, 2, 'Final', '2026-01-26', 'failed'),
  (15, 7, 2, 'Screen', '2026-01-16', 'no_show'),
  (16, 8, 4, 'Screen', '2026-02-03', 'passed'),
  (17, 8, 4, 'Technical', '2026-02-08', 'passed'),
  (18, 8, 4, 'Final', '2026-02-12', 'passed'),
  (19, 9, 4, 'Screen', '2026-02-04', 'passed'),
  (20, 9, 4, 'Final', '2026-02-14', 'passed'),
  (21, 10, 5, 'Screen', '2026-01-22', 'passed'),
  (22, 10, 5, 'Technical', '2026-01-28', NULL),
  (23, 11, 7, 'Final', '2026-02-20', 'passed'),
  (24, 6, 7, 'Final', '2026-02-21', 'failed');

------------------------------------------------------------------------------------------------------------
-- Q1. List all currently open job postings, along with the name of the recruiter who owns each one
------------------------------------------------------------------------------------------------------------
SELECT jp.id AS job_posting_id, jp.title, jp.department, jp.opened_date, r.name AS recruiter
FROM job_postings AS jp
JOIN recruiters AS r ON r.id = jp.recruiter_id
WHERE jp.status = 'open'
ORDER BY jp.id;
------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------
-- Q2. For each job posting, how many applicants reached the Final interview stage?
-- "Reached" means had a Final interview, whatever its outcome. The stage filter is in the ON
-- clause, not WHERE, so postings with no Final interviews still appear with 0.
------------------------------------------------------------------------------------------------------------
SELECT jp.id AS job_posting_id, jp.title, COUNT(DISTINCT i.applicant_id) AS applicants_reached_final
FROM job_postings AS jp
LEFT JOIN interviews AS i ON i.job_posting_id = jp.id AND i.stage = 'Final'
GROUP BY jp.id, jp.title
ORDER BY jp.id;
------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------
-- Q3. Find every person who effectively applied to more than one job posting. 
-- Careful — the data isn't as clean as it looks

-- Ananya Rao is in applicants twice (ids 1 and 2) as 'ananya.rao@mail.com' and
-- 'Ananya.Rao@mail.com'. Grouped by applicant id she looks like two people with one posting
-- each. Grouping by LOWER(email) instead treats both rows as one person, so her postings
-- 1 and 4 are counted together. Applications come from interviews.job_posting_id, because
-- applicants has no job column.
------------------------------------------------------------------------------------------------------------
SELECT MIN(a.full_name) AS person, LOWER(a.email) AS email, COUNT(DISTINCT i.job_posting_id) AS postings_applied_to
FROM applicants AS a
JOIN interviews AS i ON i.applicant_id = a.id
GROUP BY LOWER(a.email)
HAVING COUNT(DISTINCT i.job_posting_id) > 1
ORDER BY person;
------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------
-- Q4. For each recruiter, compute their Final-stage conversion rate (passed ÷ total Final-stage
-- interviews), but only include recruiters with at least 3 Final-stage interviews.
------------------------------------------------------------------------------------------------------------
SELECT r.id AS recruiter_id, r.name AS recruiter, COUNT(*) AS final_interviews,
SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END) AS passed,
ROUND(1.0 * SUM(CASE WHEN i.outcome = 'passed' THEN 1 ELSE 0 END) / COUNT(*), 2) AS conversion_rate
FROM interviews AS i
JOIN job_postings AS jp ON jp.id = i.job_posting_id JOIN recruiters AS r ON r.id = jp.recruiter_id
WHERE i.stage = 'Final' GROUP BY r.id, r.name HAVING COUNT(*) >= 3
ORDER BY conversion_rate DESC, r.id;
------------------------------------------------------------------------------------------------------------
------------------------------------------------------------------------------------------------------------
-- Q5. (Bonus) Using a window function, find the recruiter with the most successful placements
-- (passed at Final stage) per department
-- using RANK() rather than ROW_NUMBER() so that if two recruiters tie, both are returned.
------------------------------------------------------------------------------------------------------------
WITH placements AS (
  SELECT jp.department, r.id AS recruiter_id, r.name AS recruiter, COUNT(*) AS placements
  FROM interviews AS i
  JOIN job_postings AS jp ON jp.id = i.job_posting_id
  JOIN recruiters AS r ON r.id = jp.recruiter_id
  WHERE i.stage = 'Final' AND i.outcome = 'passed'
  GROUP BY jp.department, r.id, r.name
),
ranked AS (
  SELECT department, recruiter_id, recruiter, placements,
  RANK() OVER (PARTITION BY department ORDER BY placements DESC) AS department_rank
  FROM placements
)
SELECT department, recruiter, placements FROM ranked
WHERE department_rank = 1 ORDER BY department;
------------------------------------------------------------------------------------------------------------