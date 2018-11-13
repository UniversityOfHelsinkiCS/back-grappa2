# Grappa 2.0 backend

Ohjelmistotuotantoprojekti (Software lab), autumn 2017
University of Helsinki

[front end](https://github.com/UniversityOfHelsinkiCS/front-grappa2)

[Documentation](https://drive.google.com/drive/folders/0B5AboURQNTdya2xJcC0zVmVDM1E)

Grappa 2.0 (GRAdut Pikaisesti PAkettiin 2.0) will be a tool for both students and staff to manage master theses, to simplify and to speed up the whole thesis process. Made for the Helsinki University's department of Computer Science and licensed under MIT.

[![Build Status](https://travis-ci.org/UniversityOfHelsinkiCS/back-grappa2.svg?branch=master)](https://travis-ci.org/UniversityOfHelsinkiCS/back-grappa2)
[![codebeat badge](https://codebeat.co/badges/92abe60c-5b7d-4bf4-9465-f78099108342)](https://codebeat.co/projects/github-com-universityofhelsinkics-back-grappa2-master)
[![Coverage Status](https://coveralls.io/repos/github/UniversityOfHelsinkiCS/back-grappa2/badge.svg?branch=master)](https://coveralls.io/github/UniversityOfHelsinkiCS/back-grappa2?branch=master)

Dependencies: [![Known Vulnerabilities](https://snyk.io/test/github/UniversityOfHelsinkiCS/back-grappa2/badge.svg)](https://snyk.io/test/github/UniversityOfHelsinkiCS/back-grappa2)

# Installation

## Oracle
CS theses info is also stored to old Oracle database. Because enterpri$e, you just cant npm install
oracle driver. You must download and install some files manually: [instructions](hhttps://oracle.github.io/node-oracledb/INSTALL.html#-2-quick-start-node-oracledb-installation)

TL;DR; Download oracle libs to `~/lib`

## Database
Install docker & docker-compose:

Install docker CE: https://docs.docker.com/engine/installation/

Install docker-compose: https://docs.docker.com/compose/install/

Create docker-compose.yml file containing following:
```
version: '3'

services:
  grappa_db:
    image: postgres:9.6.3
    ports:
      - "5321:5432"
    volumes:
      - ./grappa_pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: grappadata
    container_name: grappa_db
```

To start the database run:
`docker-compose up -d`

## Set up project

Install node, git

Clone the repository

Run:
`npm install`

Create .env file to project root, fill the following:
```
DATABASE_URL=postgres://postgres@localhost:5321/grappadata
TOKEN_SECRET=LikeNoOneEverWas
```

Run:
`npm run db:migrate`
`npm run db:seed`
`npm start`

Tests are run using own schema for each test file. Test schema is defined using
`DB_SCHEMA` env which is set in each test file.

If you want to see logging output in console for unit tests set `CONSOLE_OUTPUT=true`

## API documentation
Generate docs `npm run apidoc`

## Endpoints in use

### GET

| ACCESS               | FRONT | BACK | PROD | TESTS | DETAILS                |
|----------------------|-------|------|------|-------|------------------------|
| /                    |       | X    |      |       | Hello world            |
| /user/login          | X     | X    | X    |       |                        |
| /user/logout         | X     | X    |      |       |                        |
| /user/:id            | X     | X    | -    |       | Not used in production |
| /agreements          | X     | X    | X    |       |                        |
| /attachments/:string | X     | X    | X    |       |                        |
| /councilmeetings     | X     | X    | X    |       |                        |
| /emailDrafts         | X     | X    | X    |       |                        |
| /invite/:type/:token | X     | X    | X    |       |                        |
| /notifications       | X     | X    | X    |       |                        |
| /persons             | X     | X    | X    |       |                        |
| /programmes          | X     | X    | X    |       |                        |
| /roles/available     | X     | X    | X    |       | All possible roles     |
| /roles               | X     | X    | X    |       | personWithRole objects |
| /studyfields         | X     | X    | X    |       |                        |
| /theses              | X     | X    | X    |       |                        |
| /theses/:id          | X     |      |      |       |                        |

### POST

| ACCESS            | FRONT | BACK | PROD | TESTS | DETAILS |
|-------------------|-------|------|------|-------|---------|
| /agreements       | X     |      |      |       |         |
| /attachments      | X     | X    | X    |       |         |
| /councilmeetings  | X     | X    | X    |       |         |
| /emailDrafts      | X     | X    |      |       |         |
| /emailDrafts/:id  | X     |      |      |       |         |
| /persons/invite   | X     | X    | X    |       |         |
| /programmes       | X     |      |      |       |         |
| /roles            | X     | X    | X    |       |         |
| /studyfields      | X     |      |      |       |         |
| /theses           | X     | X    | X    |       |         |

### DELETE

| ACCESS               | FRONT | BACK | PROD | TESTS | DETAILS |
|----------------------|-------|------|------|-------|---------|
| /attachments/:id     | X     | X    |      |       |         |
| /councilmeetings/:id | X     | X    | X    |       |         |
| /emailDrafts/:id     | X     | X    |      |       |         |
| /programmes/:id      | X     |      |      |       |         |
| /roles/:id           | X     | X    | X    |       |         |
| /studyfields/:id     | X     |      |      |       |         |
| /theses/:id          | X     |      |      |       |         |


### PUT

| ACCESS               | FRONT | BACK | PROD | TESTS | DETAILS          |
|----------------------|-------|------|------|-------|------------------|
| /councilmeetings/:id | X     | X    | X    |       |                  |
| /emailDrafts/:id     | X     | X    |      |       |                  |
| /programmes          | X     |      |      |       |                  |
| /roles               | X     | X    | X    |       | update statement |
| /studyfields         | X     |      |      |       |                  |
| /theses              | X     | X    |      |       |                  |
