"use strict";

ckan.module('form_submit', function ($) {
    return {
        initialize: function () {
            //CKAN API KEY of admin user
            // TODO How to change this to dynamic var
            var auth = "3f5c3706-ca58-4abc-bc32-6758e2509bcc";
            // CKAN URL + API init
            // TODO How to change this to dynamic var
            const init_url = this.sandbox.client.endpoint;
            var url = init_url + "/";
            //Function to create Dataset with CKAN API
            function create_dataset(dataset_name, organization_id) {
                //Create data form to send in the request
                var formData = new FormData();
                formData.append("name", dataset_name);
                formData.append("owner_org", organization_id);
                formData.append("private", true);

                //ajax request to create dataset
                $.ajax({
                    url: url + 'api/3/action/package_create', // create dataset path
                    type: 'POST',
                    headers: {
                        "Authorization": auth
                    },
                    data: formData,
                    processData: false, //prevent jquery from automatically transform data into query string
                    contentType: false, //is imperative since jquery set it incorrectly
                    success: function (data) {
                        console.log(data.result);
                    },
                    error: function (data) {
                        console.log(data);
                    }
                });
            }

            //Function to insert table into resource and first row with Datastore API
            function create_and_insert_first_row_into_resource(dataset_name, resource_name, final_json_to_send) {
                //ajax request to create resource
                $.ajax({
                    url: url + 'api/3/action/datastore_create', // create resource path
                    type: 'POST',
                    headers: {
                        "Authorization": auth
                    },
                    data: JSON.stringify({
                        "resource": {
                            "package_id": dataset_name,
                            "name": resource_name,
                            "format": "json"
                        },
                        "force": true,
                        "records": [final_json_to_send]
                    }),
                    success: function (data) {
                        console.log('ok');
                        console.log(data.result);
                    },
                    error: function (data) {
                        console.log(data);
                    }
                });
            }

            //Function to insert data row into resource with Datastore API
            function insert_new_row_into_resource(resource_id, final_json_to_send) {
                //ajax request to insert data row into resource
                $.ajax({
                    url: url + 'api/3/action/datastore_upsert', //insert row in resource path
                    type: 'POST',
                    headers: {
                        "Authorization": auth
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
                var overall_obj = {}
                //Get all info from questionnaire
                $('#quest_content_form > div').each(function () {
                    var key = this.id;
                    var key_id = key.split("_")[0];
                    var tmp_obj = {}
                    // Get all checked values from questionnaire tables
                    $("#" + key + " #all_tables tbody tr").each(function () {
                        if ($(this).find('input[type="radio"]').is(":checked")) {
                            var row_opt = $(this).find('input[type="radio"]:checked').attr("value");
                            var key_opt = $(this).find('input[type="radio"]:checked').attr("id");
                            tmp_obj[key_opt] = row_opt;
                        }
                    });
                    $("#" + key + " #all_tables .input_text").each(function () {
                        if ($(this).find('textarea').val() != "") {
                            var row_opt = $(this).find('textarea').val();
                            var key_opt = $(this).find('textarea').attr("id");
                            tmp_obj[key_opt] = row_opt;
                        }
                    });
                    overall_obj[key_id] = tmp_obj;
                });

                var resource_id = "";
                setTimeout(function () {
                    // TODO Change this to custom field and get it in the beginning
                    let dataset_name = "";
                    //var resource_name = ["caregivers", "health_professionals", "patients"]; //env var
                    let organization_id = "";
                    let dataset_exists = false;
                    let resource_exists = false;
                    let resource_to_use = "";

                    // Get all datasets from a specific user with his key
                    $.ajax({
                        url: url + 'api/3/action/current_package_list_with_resources',
                        type: 'GET',
                        headers: {
                            "Authorization": auth
                        },
                        success: function (data) {
                            for (var i = 0; i < data.result.length; i++) {
                                //If organization wasnt associated already
                                if (organization_id == "") {
                                    if (data.result[i]["owner_org"] && data.result[i]["owner_org"] != "") {
                                        organization_id = data.result[i]["owner_org"];
                                    }
                                }
                                if (dataset_name == "") {
                                    if (data.result[i]["extras"].length > 0) {
                                        for (var u = 0; u < data.result[i]["extras"].length; u++) {
                                            if (data.result[i]["extras"][u]["key"] == "is_data_store") {
                                                dataset_name = data.result[i]["name"];
                                                break;
                                            }
                                        }
                                    }
                                }
                                // First check if dataset and his resource exists
                                if (data.result[i]["name"] == dataset_name) {
                                    dataset_exists = true;
                                    if (data.result[i]["resources"].length > 0) {
                                        for (var u = 0; u < data.result[i]["resources"].length; u++) {
                                            if (type_quest == data.result[i]["resources"][u]["name"]) {
                                                resource_exists = true;
                                                resource_id = data.result[i]["resources"][u]["id"];
                                                resource_to_use = data.result[i]["resources"][u]["name"];
                                                break;
                                            }
                                        }
                                    }
                                }
                            }

                            //Final json structure to send to rabbit
                            var final_json_to_send = { "id": type_quest, "info": type_quest + "_quest", "records": overall_obj };
                            // In case of dataset of resource doenst exists create them
                            if (!dataset_exists) {
                                //Create dataset
                                dataset_name = "Survey Content Automatic - " + organization_id;
                                create_dataset(dataset_name, organization_id);
                                //Create new resource and insert into it
                                create_and_insert_first_row_into_resource(dataset_name, type_quest, final_json_to_send);
                            }
                            else if (!resource_exists) {
                                //Create new resource and insert into it
                                create_and_insert_first_row_into_resource(dataset_name, type_quest, final_json_to_send);
                            }
                            else {
                                //Insert into resource
                                insert_new_row_into_resource(resource_id, final_json_to_send);
                            }
                        },
                        error: function (data) {
                            console.log(data);
                        }
                    });
                    window.location.href = "/";
                }, 3000);
            });
        }
    };
});