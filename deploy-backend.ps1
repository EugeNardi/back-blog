# Script para redesplegar el backend en Vercel
# Ejecutar con: .\deploy-backend.ps1

Write-Host "🚀 Redesplegando Backend en Vercel..." -ForegroundColor Cyan
Write-Host ""

# Verificar si vercel está instalado
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-Not $vercelInstalled) {
    Write-Host "❌ Vercel CLI no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instálalo con:" -ForegroundColor Yellow
    Write-Host "npm install -g vercel" -ForegroundColor White
    Write-Host ""
    exit
}

Write-Host "📦 Desplegando en producción..." -ForegroundColor Yellow
Write-Host ""

# Desplegar en producción
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Backend redesplegado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 URL del backend: https://back-blog-beta.vercel.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔍 Verifica que funcione:" -ForegroundColor Yellow
    Write-Host "1. Abre: https://back-blog-beta.vercel.app" -ForegroundColor White
    Write-Host "2. Deberías ver: 'el servidor funciona'" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Recarga tu sitio: https://noticias-x.netlify.app" -ForegroundColor White
    Write-Host "4. El error de CORS debería estar resuelto" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Error al desplegar" -ForegroundColor Red
    Write-Host "Verifica tu conexión y que estés autenticado en Vercel" -ForegroundColor Yellow
}
