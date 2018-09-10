import { HTTP } from 'meteor/http';


// Imports the Google Cloud client library
const BigQuery = require('@google-cloud/bigquery');

// Your Google Cloud Platform project ID
const projectId = 'fapipeline';


// Creates a client
const bigquery = new BigQuery({
  projectId: projectId,
});

// Fill database with questions to use
const testing = false;

Questions.remove({});

if (testing) {
	var questionsInDB = Questions.find().fetch();

	if (questionsInDB.length == 0) {
		const question1 = {question: "Test question 1", answer: "1:2"};
		const question2 = {question: "Test question 2", answer: "2:4"};
		const question3 = {question: "Test question 3", answer: "3:2"};

		Questions.insert(question1);
		Questions.insert(question2);
		Questions.insert(question3);
	}
} else {	
	var questions = Questions.findOne();
	console.log("Quesitons exist:", questions);

	if (questions === undefined) {
		console.log("Getting some questions!");

		const sqlQuery = `select
	    match_tournaments.teams as teams,
	    unique_tournaments.name as unique_tournament_name,
	    ft_score,
	    format_timestamp("%F", kickof_at, "Europe/Stockholm") as kickof
	  from(
	    select
	      matches.id as match_id,
	      tournaments.unique_tournament_id as unique_tournament_id,
	      concat(team1_name, " vs. ",team2_name) as teams,
	      kickof_at,
	      ft_score
	    from (
	      select
	        team1_names.match_id as id,
	        team1_names.tournament_id as tournament_id,
	        team1_names.team1_name as team1_name,
	        team2_names.team2_name as team2_name,
	        team1_names.kickof_at as kickof_at,
	        team1_names.ft_score as ft_score
	      from
	        (select
	          matches.id as match_id,
	          matches.tournament_id as tournament_id,
	          teams.name as team1_name,
	          matches.kickof_at as kickof_at,
	          matches.ft_score as ft_score
	        from
	         (select
	            id,
	            tournament_id,
	            team1_id,
	            kickof_at,
	            ft_score
	          from
	            `+'`metadata.matches_*`'+`
	          where
	            _table_suffix = format_date("%Y%m%d", date_sub(current_date(), interval 1 day))
	            and ft_score != ""
	            and ft_score != "0:0"
	            and kickof_at > timestamp('2014-06-01')) matches
	        inner join(
	          select
	            id,
	            name
	          from
	            `+'`metadata.teams_*`'+`
	          where
	            _table_suffix = format_date("%Y%m%d", date_sub(current_date(), interval 1 day))) teams
	        on
	          matches.team1_id = teams.id) team1_names
	      inner join (
	        select
	          matches.id as match_id,
	          teams.name as team2_name
	        from
	         (select
	            id,
	            team2_id
	          from
	            `+'`metadata.matches_*`'+`
	          where
	            _table_suffix = format_date("%Y%m%d", date_sub(current_date(), interval 1 day))) matches
	        inner join(
	          select
	            id,
	            name
	          from
	            `+'`metadata.teams_*`'+`
	          where
	            _table_suffix = format_date("%Y%m%d", date_sub(current_date(), interval 1 day))) teams
	        on
	          matches.team2_id = teams.id) team2_names
	      on
	        team1_names.match_id = team2_names.match_id) matches
	    inner join (
	      select
	        id as tournament_id,
	        unique_tournament_id
	      from
	        `+'`metadata.tournaments_*`'+`
	      where
	        _table_suffix = format_date("%Y%m%d", date_sub(current_date(), interval 1 day))
	        and unique_tournament_id in(16)) tournaments
	    on
	      matches.tournament_id = tournaments.tournament_id) match_tournaments
	  inner join (
	    select
	      id,
	      name
	    from
	      `+'`metadata.unique_tournaments_*`'+`
	    where
	      _table_suffix = format_date("%Y%m%d", date_sub(current_date(), interval 1 day))) unique_tournaments
	  on
	    unique_tournaments.id = match_tournaments.unique_tournament_id
	  limit 10`;

	  // Query options list: https://cloud.google.com/bigquery/docs/reference/v2/jobs/query
	  const options = {
	    query: sqlQuery,
	    useLegacySql: false, // Use standard SQL syntax for queries.
	  };

	  // Runs the query
	  bigquery
	    .query(options)
	    .then(results => {
	      const rows = results[0];

	      rows.forEach(function(row) {
	      	var question = {
	      		question: "How did " + row.teams + " in the " + row.unique_tournament_name + " played at " + row.kickof + " end?",
	      		answer: row.ft_score
	      	}
	      	Questions.insert(question);
	      })

	      console.log("Done inserting questions!");

	    })
	    .catch(err => {
	      console.error('ERROR:', err);
	    });

  }
}

