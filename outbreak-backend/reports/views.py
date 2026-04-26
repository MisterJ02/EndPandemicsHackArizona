import json

from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response

from .models import Report
from .serializers import ReportSerializer


def _extract_session_id(request) -> str:
    """Pulls session_id from header first, falling back to body."""
    sid = request.headers.get("X-Session-Id", "").strip()
    if sid:
        return sid
    data = request.data if hasattr(request, "data") else {}
    if isinstance(data, dict):
        return (data.get("session_id") or "").strip()
    return ""


class ReportListCreate(generics.ListCreateAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer


class ReportDestroy(generics.DestroyAPIView):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer

    def destroy(self, request, *args, **kwargs):
        report = self.get_object()
        sid = _extract_session_id(request)
        if not sid:
            return Response(
                {"detail": "session_id required"}, status=status.HTTP_400_BAD_REQUEST
            )
        if report.session_id != sid:
            return Response(
                {"detail": "You can only delete reports created by your session."},
                status=status.HTTP_403_FORBIDDEN,
            )
        report.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
