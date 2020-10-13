/*
This file is responsible for the submit of a questionnaire. When a questionnaire is submitted,
it will be stored in a specific resource from a dataset that is marked as a 'is_data_store'.
If the resource doesnt exists in the moment of submission, it is created and then the all
the info is stored there. Otherwise, the resource is updated with a new response. 
*/
"use strict";

ckan.module('form_submit', function ($) {
    return {
        initialize: function () {
            // CKAN url
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";

            // Get organization name
            var urlParams = new URLSearchParams(window.location.search);
            var organization_id = urlParams.get('organization-id');

            // CKAN user apikey
            var api_ckan_key = "";
            var username = "----";
            // Ajax request (GET) to get apikey from the logged user
            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    if ((data.result) && (data.result.hasOwnProperty("user_logged"))) {
                        api_ckan_key = data.result["user_logged"]["apikey"];
                        username = data.result["user_logged"]["name"]
                    }
                },
                error: function (data) {
                    console.log(data);
                }
            });

            //Function to create Dataset with CKAN API
            //Not used but kept it for future work
            function create_dataset_and_store_resource(dataset_name, organization_id, type_quest, final_json_to_send, list_with_all_questions_and_answers_ids) {
                //Create data form to send in the request
                var dataset_id = dataset_name.split(" ").join("-").toLowerCase();
                let json_data = {};
                json_data["title"] = dataset_name;
                json_data["name"] = dataset_id;
                json_data["owner_org"] = organization_id;
                json_data["private"] = "true";
                json_data["extras"] = [{ "key": "is_data_store", "value": "true" }];
                //ajax request to create dataset
                $.ajax({
                    url: url + 'api/3/action/package_create', // create dataset path
                    type: 'POST',
                    headers: {
                        "Authorization": api_ckan_key
                    },
                    data: JSON.stringify(json_data),
                    dataType: "json",
                    contentType: 'application/json; charset=utf-8',
                    success: function (data) {
                        console.log(data.result);
                        var first = true;
                        //Create new resource and insert into it
                        create_and_insert_first_row_into_resource(dataset_id, type_quest, final_json_to_send, list_with_all_questions_and_answers_ids, first);
                    },
                    error: function (ts) {
                        console.log(ts.responseText);
                    }
                });
                return dataset_id;
            }

            //Function to insert table into resource and first row with Datastore API
            ////Not used but kept it for future work
            function create_and_insert_first_row_into_resource(dataset_name, resource_name, final_json_to_send, list_with_all_questions_and_answers_ids, is_first = false) {
                //Get types and consequent questions/answer keys
                var fiels_resource = [{ "id": "id" }, { "id": "info" }, { "id": "date_submitted" }];
                list_with_all_questions_and_answers_ids.map((x => {
                    fiels_resource.push({ "id": x });
                    if (is_first == true)
                        if (!final_json_to_send.hasOwnProperty(x)) {
                            final_json_to_send[x] = "";
                        }

                }));
                //ajax request to create resource
                $.ajax({
                    url: url + 'api/3/action/datastore_create', // create resource path
                    type: 'POST',
                    headers: {
                        "Authorization": api_ckan_key
                    },
                    data: JSON.stringify({
                        "resource": {
                            "package_id": dataset_name,
                            "name": resource_name,
                            "format": "json"
                        },
                        "force": true,
                        "fields": fiels_resource,
                        "records": [final_json_to_send]
                    }),
                    success: function (data) {
                        console.log('ok');
                        console.log(data.result);
                    },
                    error: function (ts) {
                        console.log(ts.responseText);
                    }
                });
            }

            //Function to insert data row into resource with Datastore API
            //Not used but kept it for future work
            function insert_new_row_into_resource(resource_id, final_json_to_send) {
                //ajax request to insert data row into resource
                console.log(final_json_to_send["records"]);
                $.ajax({
                    url: url + 'api/3/action/datastore_upsert', //insert row in resource path
                    type: 'POST',
                    headers: {
                        "Authorization": api_ckan_key
                    },
                    data: JSON.stringify({
                        "resource_id": resource_id,
                        "force": true,
                        "method": "insert",
                        "records": [final_json_to_send]
                    }),
                    success: function (data) {
                        console.log(data.result);
                    },
                    error: function (data) {
                        console.log(data);
                    }
                });
            }

            //Function on clicking to submit, save and close questionnaire
            $("#submitForm").click(function () {
                // Get the type of questionnaire string from the title
                var type_quest = $("#form-title").text().toLowerCase().split("-")[1].trim().split(" ").join("_")
                // Hide div with the final state's text of the questionnaire
                $("#finish_quest").css("display", "none");
                // Show loader
                $("#loader").css("display", "block");
                let questions_entity = [];
                var list_with_all_questions_and_answers_ids = [];
                //Get all info from questionnaire
                $('#quest_content_form > div').each(function () {
                    var key = this.id;
                    // Get all checked values from questionnaire tables
                    $("#" + key + " #all_tables tbody tr").each(function () {
                        // Get id row
                        var key_opt = $(this).find('input[type="radio"]').attr("id");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_question");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_answer");
                        if ($(this).find('input[type="radio"]').is(":checked")) {
                            // Get question
                            var row_question = $(this).find('th').text().replace('\t', '').replace('*', '');
                            // Get answer
                            var row_opt = $(this).find('input[type="radio"]:checked').attr("value");
                            // Define data structure of questions/answers
                            questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: row_opt });
                        }

                    });
                    $("#" + key + " #all_tables .input_text").each(function () {
                        // Get id row
                        var key_opt = $(this).find('textarea').attr("id");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_question");
                        list_with_all_questions_and_answers_ids.push(key_opt + "_answer");
                        if ($(this).find('textarea').val() != "") {
                            // Get question
                            var row_question = $(this).find('label').text().replace('\t', '').replace('*', '');
                            // Get answer
                            var row_opt = $(this).find('textarea').val();
                            // Define data structure of questions/answers
                            questions_entity.push({ [key_opt + "_question"]: row_question, [key_opt + "_answer"]: row_opt });
                        }
                    });
                });

                setTimeout(function () {
                    // Variable to store current date
                    var currentdate_no_timezone = new Date();
                    currentdate_no_timezone = currentdate_no_timezone.getTimezoneOffset();
                    if (currentdate_no_timezone < 0)
                        currentdate_no_timezone = Math.abs(currentdate_no_timezone);
                    else
                        currentdate_no_timezone = -Math.abs(currentdate_no_timezone);
                    var currentdate = new Date();
                    currentdate.setMinutes(currentdate.getMinutes() + currentdate_no_timezone);
                    // Final json structure
                    var final_json_to_send = { "id": type_quest, "info": type_quest + "_quest", "date_submitted": currentdate, "username": username };
                    // Fields that already exists in the final json
                    var fiels_resource = [{ "id": "id" }, { "id": "info" }, { "id": "date_submitted" }, { "id": "username" }];
                    // Auxiliar boolean to be able to insert the questions and answer that were answered
                    let it_has_answer = false;

                    list_with_all_questions_and_answers_ids.map((x => {
                        fiels_resource.push({ "id": x });
                        // In case of final json doesnt contain the key 'x', add it to the final json
                        // and if has a value, associate it. Otherwise leave it blank
                        if (!final_json_to_send.hasOwnProperty(x)) {
                            questions_entity.forEach(y => {
                                if (y.hasOwnProperty(x)) {
                                    for (const [key, value] of Object.entries(y)) {
                                        if (key == x) {
                                            final_json_to_send[x] = value;
                                            it_has_answer = true;
                                            break;
                                        }
                                    }
                                }
                            });
                            if (!it_has_answer) {
                                final_json_to_send[x] = "";
                            }
                            else
                                it_has_answer = false;
                        }

                    }));

                    // Ajax request (GET) to call custom request to create and/or insert submitted questionnaires
                    $.ajax({
                        url: url + 'api/3/action/insert_quests',
                        type: 'POST',
                        data: JSON.stringify({ "name_resource": type_quest, "organization_id": organization_id, "result": JSON.stringify(final_json_to_send) }),
                        dataType: "json",
                        contentType: "application/json; charset=utf-8",
                        success: function (data) {
                            console.log(data);
                            window.location.href = "/";
                        }
                    });
                }, 3000);
            });
        }
    };
});