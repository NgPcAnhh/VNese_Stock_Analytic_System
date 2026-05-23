"""Pydantic schemas for the News module."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Request schemas ────────────────────────────────────────────────

class TrackClickRequest(BaseModel):
    article_id: int = Field(..., description="ID bài báo trong bảng news")
    session_id: str = Field(default="anonymous", max_length=64)


class TrackSearchRequest(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255, description="Từ khóa tìm kiếm")
    session_id: str = Field(default="anonymous", max_length=64)


# ── Response schemas ───────────────────────────────────────────────

class NewsArticle(BaseModel):
    id: int
    title: Optional[str] = None
    source: Optional[str] = None
    published: Optional[str] = None
    summary: Optional[str] = None
    link: Optional[str] = None


class NewsPaginatedResponse(BaseModel):
    data: List[NewsArticle]
    total: int = Field(..., description="Tổng số bài viết khớp điều kiện")
    page: int
    page_size: int
    total_pages: int


class MostClickedArticle(BaseModel):
    id: int
    title: Optional[str] = None
    source: Optional[str] = None
    published: Optional[str] = None
    link: Optional[str] = None
    click_count: int = Field(..., description="Số lượt click")


class HotSearchItem(BaseModel):
    keyword: str
    search_count: int = Field(..., description="Số lần tìm kiếm")


class TrackResponse(BaseModel):
    success: bool = True
    message: str = "OK"
