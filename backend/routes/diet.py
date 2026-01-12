from http import HTTPStatus

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required


diet_bp = Blueprint("diet", __name__, url_prefix="/api/diet")

_DIET_DATA = {
    "vegetarian": {
        "breakfast": {
            "items": ["Poha", "Sprouts Salad", "Masala Chaas"],
            "macros": {"protein": 18, "carbs": 65, "fats": 12, "calories": 420},
        },
        "lunch": {
            "items": ["Brown Rice", "Dal Tadka", "Mixed Veg Sabzi"],
            "macros": {"protein": 25, "carbs": 75, "fats": 18, "calories": 520},
        },
        "dinner": {
            "items": ["Multigrain Roti", "Paneer Bhurji", "Salad"],
            "macros": {"protein": 28, "carbs": 55, "fats": 14, "calories": 430},
        },
        "snacks": {
            "items": ["Buttermilk", "Roasted Chana"],
            "macros": {"protein": 12, "carbs": 18, "fats": 8, "calories": 210},
        },
    },
    "non_vegetarian": {
        "breakfast": {
            "items": ["Oats Upma", "Egg Whites", "Green Tea"],
            "macros": {"protein": 30, "carbs": 50, "fats": 10, "calories": 400},
        },
        "lunch": {
            "items": ["Quinoa", "Grilled Chicken", "Palak"],
            "macros": {"protein": 40, "carbs": 60, "fats": 16, "calories": 560},
        },
        "dinner": {
            "items": ["Ragi Roti", "Fish Curry", "Cucumber Salad"],
            "macros": {"protein": 36, "carbs": 45, "fats": 15, "calories": 480},
        },
        "snacks": {
            "items": ["Greek Yogurt", "Nuts"],
            "macros": {"protein": 18, "carbs": 20, "fats": 12, "calories": 280},
        },
    },
}

_ACTIVITY_MAP = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "intense": 1.725,
}


@diet_bp.get("/plans")
@jwt_required()
def get_plans():
    plan_type = request.args.get("type", "vegetarian")
    activity = request.args.get("activity", "moderate")
    weight = float(request.args.get("weight", 70))
    height = float(request.args.get("height", 170))
    age = int(request.args.get("age", 28))
    gender = request.args.get("gender", "male")

    bmr = _calculate_bmr(weight, height, age, gender)
    multiplier = _ACTIVITY_MAP.get(activity, 1.55)
    target_calories = round(bmr * multiplier)

    plan = _DIET_DATA.get(plan_type, _DIET_DATA["vegetarian"])
    macros_table = _build_macros_table(plan)

    return (
        jsonify(
            {
                "plan_type": plan_type,
                "activity_level": activity,
                "target_calories": target_calories,
                "sections": plan,
                "macros_table": macros_table,
            }
        ),
        HTTPStatus.OK,
    )


def _calculate_bmr(weight, height, age, gender):
    if gender.lower() == "male":
        return 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    return 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)


def _build_macros_table(plan):
    totals = {"protein": 0, "carbs": 0, "fats": 0, "calories": 0}
    rows = []

    for section, data in plan.items():
        macros = data["macros"]
        rows.append({"meal": section, **macros})
        for key in totals:
            totals[key] += macros[key]

    return {"rows": rows, "totals": totals}
