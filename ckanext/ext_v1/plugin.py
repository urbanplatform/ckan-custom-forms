import ckan.plugins as plugins
import ckan.plugins.toolkit as toolkit
from flask import Blueprint, request
import ckan.lib.base as base
import os

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
    # The actual custom API method
    admin_info = templating_resources()

    if "apikey" in admin_info:
        key = admin_info["apikey"]
    else:
        key = ""

    return {"admin_key": key}


def templating_resources():
    """
    Return all the resources that are for templating
    """
    user = toolkit.get_action("user_list")(
        data_dict={"q": os.environ.get("CKAN_SYSADMIN_NAME", "")}
    )
    user_id = user[0]["id"]

    user_admin = toolkit.get_action("user_show")(data_dict={"id": user_id})
    return user_admin


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
        return {"get_key": get_key}
