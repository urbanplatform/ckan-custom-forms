import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from flask import Blueprint, request
import ckan.lib.base as base
import os
import json, ast

# Blueprint
questionnaire = Blueprint("questionnaire", __name__)

# Render html page on ckan
render = base.render


# method to be able to render questionnaires on ckan
@questionnaire.route("/questionnaire", endpoint="custom_action")
def custom_action():
    resource_id = request.args.get("resource-id", type=str)
    dataset_id = request.args.get("dataset-id", type=str)
    type_quest = request.args.get("type_quest", type=str)
    return toolkit.render(
        "home/questionnaires.html",
        extra_vars={
            "resource-id": resource_id,
            "dataset-id": dataset_id,
            "type_quest": type_quest,
        },
    )


@toolkit.side_effect_free
def get_key(context, data_dict=None):
    """
    Method to get the apikey from logged user
    """
    users = toolkit.get_action("user_list")(data_dict={})
    for user in users:
        user_id = user["id"]
        user_logged = toolkit.get_action("user_show")(data_dict={"id": user_id})
        if "apikey" in user_logged:
            return {"user_logged": user_logged}


@toolkit.side_effect_free
def insert_quests(context, data_dict=None):
    """
    Method to enable members to submit questionnaires and add them into a specific resource
    By getting the dataset creator id, we are able to do a temporary login and get the apikey.
    With it, we can do datastore_update with success and store the response from any user.
    """
    name_resource = data_dict["name_resource"]
    model = context["model"]

    resource = (
        model.Session.query(model.Resource)
        .filter(model.Resource.name == name_resource)
        .filter(model.Resource.state == "active")
        .one()
    )
    if resource:
        result = ast.literal_eval(json.dumps(data_dict["result"]))
        data_to_send = {
            "resource_id": resource.id.encode("utf-8"),
            "force": "true",
            "method": "insert",
            "records": [ast.literal_eval(result)],
        }
        insert_quest = toolkit.get_action("datastore_upsert")(
            context={"ignore_auth": "true"}, data_dict=data_to_send,
        )

        return insert_quest
    else:
        # Create resource and insert on it
        print("ww")
    # VERIFY FIRST IF THERE IS DATASET


class Ext_V1Plugin(plugins.SingletonPlugin, toolkit.DefaultDatasetForm):
    plugins.implements(plugins.IConfigurer)
    plugins.implements(plugins.IBlueprint)
    plugins.implements(plugins.interfaces.IActions)

    def update_config(self, config_):
        toolkit.add_template_directory(config_, "templates")
        toolkit.add_public_directory(config_, "public")
        toolkit.add_resource("fanstatic", "ext_v1")

    def get_blueprint(self):

        return questionnaire

    def get_actions(self):
        # Registers the custom API method defined above
        return {"get_key": get_key, "insert_quests": insert_quests}
