"""Train and register a delay classifier using MLflow and Unity Catalog."""

import mlflow
from mlflow.models import infer_signature
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def train(spark, feature_table: str, registered_model: str) -> None:
    # Label must be joined point-in-time from actual delivery facts; it is never
    # derived from information that was unavailable at feature_timestamp.
    frame = spark.table(feature_table).filter("is_delayed IS NOT NULL").toPandas()
    target = frame.pop("is_delayed")
    feature_names = [
        "currency", "total_amount_minor", "line_count", "total_quantity",
        "requested_lead_days", "order_day_of_week",
    ]
    categorical = ["currency"]
    numeric = [name for name in feature_names if name not in categorical]
    preprocessing = ColumnTransformer([
        ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical),
        ("numeric", Pipeline([("impute", SimpleImputer()), ("scale", StandardScaler())]), numeric),
    ])
    model = Pipeline([("features", preprocessing), ("classifier", LogisticRegression(max_iter=1000))])
    model.fit(frame[feature_names], target)

    mlflow.set_registry_uri("databricks-uc")
    with mlflow.start_run():
        mlflow.log_params({"algorithm": "logistic_regression", "feature_table": feature_table})
        mlflow.sklearn.log_model(
            model,
            artifact_path="model",
            registered_model_name=registered_model,
            signature=infer_signature(frame[feature_names], model.predict_proba(frame[feature_names])),
            input_example=frame[feature_names].head(5),
        )


if __name__ == "__main__":
    train(spark, dbutils.widgets.get("feature_table"), dbutils.widgets.get("registered_model"))  # noqa: F821

