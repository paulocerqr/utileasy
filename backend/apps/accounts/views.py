from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserSerializer, UpdateProfileSerializer, DeleteAccountSerializer


class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrf_token": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", ""))
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Usuário ou senha inválidos."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not user.is_active:
            return Response(
                {"detail": "Esta conta está desativada."},
                status=status.HTTP_403_FORBIDDEN,
            )
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if "first_name" in serializer.validated_data:
                user.first_name = serializer.validated_data["first_name"]
                user.save(update_fields=["first_name"])
            
            if "bio" in serializer.validated_data:
                profile = getattr(user, "profile", None)
                if profile:
                    profile.bio = serializer.validated_data["bio"]
                    profile.save(update_fields=["bio"])
            
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AvatarView(APIView):
    def get(self, request):
        profile = getattr(request.user, "profile", None)
        if not profile or not profile.avatar:
            return Response(status=status.HTTP_404_NOT_FOUND)
        avatar_file = profile.avatar
        try:
            content_type = "image/jpeg"
            name = avatar_file.name.lower()
            if name.endswith(".png"):
                content_type = "image/png"
            elif name.endswith(".webp"):
                content_type = "image/webp"
            from django.http import FileResponse
            return FileResponse(avatar_file.open("rb"), content_type=content_type)
        except Exception:
            return Response(status=status.HTTP_404_NOT_FOUND)

    def post(self, request):
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": "Nenhum arquivo enviado."}, status=status.HTTP_400_BAD_REQUEST)
        
        if avatar.size > 2 * 1024 * 1024:
            return Response({"detail": "O arquivo deve ter no máximo 2MB."}, status=status.HTTP_400_BAD_REQUEST)
        
        if avatar.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            return Response({"detail": "Formato de arquivo não suportado."}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(request.user, "profile", None)
        if profile:
            profile.avatar = avatar
            profile.save(update_fields=["avatar"])
            return Response(UserSerializer(request.user).data)
        return Response({"detail": "Perfil não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request):
        profile = getattr(request.user, "profile", None)
        if profile and profile.avatar:
            profile.avatar.delete(save=False)
            profile.avatar = ""
            profile.save(update_fields=["avatar"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class DeleteAccountView(APIView):
    def post(self, request):
        serializer = DeleteAccountSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data["password"]):
                return Response({"detail": "Senha incorreta."}, status=status.HTTP_400_BAD_REQUEST)
            
            user.is_active = False
            user.save(update_fields=["is_active"])
            logout(request)
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
