"""
Data models for the CIS Visualization API.
"""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union


class Error(BaseModel):
    """Error response model."""
    error: str


class VariableMapping(BaseModel):
    """Model for variable mapping (code -> label)."""
    __root__: Dict[str, str]


class VariableResponse(BaseModel):
    """Response model for variables endpoint."""
    variables: Dict[str, str]


class DataRow(BaseModel):
    """Model for a single data row."""
    __root__: Dict[str, Any]


class DataResponse(BaseModel):
    """Response model for data endpoint."""
    datos: List[Dict[str, Any]]


class DistributionValue(BaseModel):
    """Model for distribution counts."""
    __root__: Dict[str, int]


class DistributionResponse(BaseModel):
    """Response model for distribution endpoint."""
    distribucion: Dict[str, int]


class MetadataLabels(BaseModel):
    """Model for variable labels metadata."""
    etiquetas_variables: List[str] = Field(...)
    etiquetas_valores: Dict[str, Dict[float, str]] = Field(...)


class ContingencyValueDetail(BaseModel):
    """Model for a cell in contingency table."""
    frecuencia: int
    porcentaje_fila: Optional[float] = None
    porcentaje_columna: Optional[float] = None


class ContingencyRowValue(BaseModel):
    """Model for a row in contingency table."""
    etiqueta: str
    valores: Dict[str, ContingencyValueDetail]


class ContingencyColumnLabel(BaseModel):
    """Model for column labels in contingency table."""
    etiqueta: str


class ContingencyVariableMetadata(BaseModel):
    """Model for variable metadata in contingency table."""
    codigo: str
    etiqueta: str
    total_casos: Optional[int] = None


class ContingencyData(BaseModel):
    """Model for contingency table data."""
    filas: Dict[str, ContingencyRowValue]
    columnas: Dict[str, ContingencyColumnLabel]


class ContingencyMetadata(BaseModel):
    """Model for contingency table metadata."""
    variable1: ContingencyVariableMetadata
    variable2: ContingencyVariableMetadata


class ContingencyResponse(BaseModel):
    """Response model for contingency table endpoint."""
    datos: ContingencyData
    metadatos: ContingencyMetadata


# Union types for responses that might return errors
DataResponseWithError = Union[DataResponse, Error]
DistributionResponseWithError = Union[DistributionResponse, Error]
ContingencyResponseWithError = Union[ContingencyResponse, Error]
