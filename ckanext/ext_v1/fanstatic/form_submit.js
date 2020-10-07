"use strict";

ckan.module('form_submit', function ($) {
    return {
        initialize: function () {
            // CKAN URL + API init
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";

            //CKAN API KEY of admin user
            var api_ckan_key = "";
            $.ajax({
                url: url + 'api/3/action/get_key',
                type: 'GET',
                success: function (data) {
                    api_ckan_key = data.result["user_logged"]["apikey"];
                },
                error: function (data) {
                    console.log(data);
                }
            });
            //Function to create Dataset with CKAN API
            //Not used but kept it for future work
            function create_dataset_and_store_resource(dataset_name, organization_id, type_quest, final_json_to_send, tmp_obj) {
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
                        create_and_insert_first_row_into_resource(dataset_id, type_quest, final_json_to_send, tmp_obj, first);
                    },
                    error: function (ts) {
                        console.log(ts.responseText);
                    }
                });
                return dataset_id;
            }

            //Function to insert table into resource and first row with Datastore API
            ////Not used but kept it for future work
            function create_and_insert_first_row_into_resource(dataset_name, resource_name, final_json_to_send, tmp_obj, is_first = false) {
                //Get types and consequent questions/answer keys
                var fiels_resource = [{ "id": "id" }, { "id": "info" }, { "id": "date_submitted" }];
                tmp_obj.map((x => {
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

            //Function on clicking to save and close questionnaire
            $("#submitForm").click(function () {
                // Get the type of questionnaire string from the title
                var type_quest = $("#form-title").text().toLowerCase().split("-")[1].trim().split(" ").join("_")
                // Hide div with the final state's text of the questionnaire
                $("#finish_quest").css("display", "none");
                // Show loader
                $("#loader").css("display", "block");
                let questions_entity = [];
                var tmp_obj = [];
                //Get all info from questionnaire
                $('#quest_content_form > div').each(function () {
                    var key = this.id;
                    // Get all checked values from questionnaire tables
                    $("#" + key + " #all_tables tbody tr").each(function () {
                        // Get id row
                        var key_opt = $(this).find('input[type="radio"]').attr("id");
                        tmp_obj.push(key_opt + "_question");
                        tmp_obj.push(key_opt + "_answer");
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
                        tmp_obj.push(key_opt + "_question");
                        tmp_obj.push(key_opt + "_answer");
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

                    //Final json structure to send to rabbit
                    var currentdate = new Date();
                    var final_json_to_send = { "id": type_quest, "info": type_quest + "_quest", "date_submitted": currentdate };
                    //Get types and consequent questions/answer keys
                    var fiels_resource = [{ "id": "id" }, { "id": "info" }, { "id": "date_submitted" }];

                    let aux_bool = false;
                    tmp_obj.map((x => {
                        fiels_resource.push({ "id": x });
                        if (!final_json_to_send.hasOwnProperty(x)) {
                            questions_entity.forEach(y => {
                                if (y.hasOwnProperty(x)) {
                                    for (const [key, value] of Object.entries(y)) {
                                        if (key == x) {
                                            final_json_to_send[x] = value;
                                            aux_bool = true;
                                            break;
                                        }
                                    }
                                }
                            });
                            if (!aux_bool) {
                                final_json_to_send[x] = "";
                            }
                            else
                                aux_bool = false;
                        }

                    }));

                    //Method that call custom request to create and/or insert submitted questionnaires
                    //in specific resources
                    $.ajax({
                        url: url + 'api/3/action/insert_quests',
                        type: 'GET',
                        data: { "name_resource": type_quest, "result": JSON.stringify(final_json_to_send) },
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