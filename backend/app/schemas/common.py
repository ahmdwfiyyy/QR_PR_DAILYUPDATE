from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer

# Prices are exact decimals in the database but plain numbers in JSON
MoneyOut = Annotated[Decimal, PlainSerializer(float, return_type=float)]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)
