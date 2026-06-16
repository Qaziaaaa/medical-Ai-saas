$BASE = "http://localhost:5000"
$pass = 0; $fail = 0

function Check($name, $r, $field) {
  if ($r.success -and ((!$field) -or $r.data.$field)) {
    Write-Host "  OK $name" -ForegroundColor Green; $script:pass++
  } else {
    Write-Host "  FAIL $name" -ForegroundColor Red; $script:fail++
  }
}

Write-Host "========== E2E TESTS ==========" -ForegroundColor Cyan

# 1. Health
Write-Host "`n-- Health --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/health" -TimeoutSec 5
Check "Health check" @{success=$r.status -eq "ok";data=$r}

# 2. Auth
Write-Host "`n-- Auth --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"doctor@clinic.demo","password":"Doctor@123"}' -TimeoutSec 5
Check "Login doctor" $r "token"
$docToken = $r.data.token

$r = Invoke-RestMethod "$BASE/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"receptionist@clinic.demo","password":"Recept@123"}' -TimeoutSec 5
Check "Login receptionist" $r "token"
$recToken = $r.data.token

$h = @{Authorization="Bearer $docToken"}
$rh = @{Authorization="Bearer $recToken"}
if (-not $docToken) { Write-Host "ABORT: no doctor token" -ForegroundColor Red; exit }

# 3. Patients
Write-Host "`n-- Patients --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/api/patients?limit=5" -Headers $h -TimeoutSec 5
Check "List patients" $r "patients"

$r = Invoke-RestMethod "$BASE/api/patients" -Method POST -Headers $rh -ContentType "application/json" -Body '{"fullName":"E2E Test Patient","dateOfBirth":"1990-01-15","gender":"male","contactNumber":"+1 555 000 0000"}' -TimeoutSec 5
Check "Create patient" $r "patient"
$patId = $r.data.patient._id

$r = Invoke-RestMethod "$BASE/api/patients/$patId" -Headers $h -TimeoutSec 5
Check "Get patient by ID" $r "patient"

# 4. Doctors list
Write-Host "`n-- Doctors --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/api/users/doctors" -Headers $h -TimeoutSec 5
Check "List doctors" $r "doctors"

# 5. Appointments
Write-Host "`n-- Appointments --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/api/appointments?limit=5" -Headers $h -TimeoutSec 5
Check "List appointments" $r "appointments"

# 6. Prescriptions
Write-Host "`n-- Prescriptions --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/api/prescriptions?limit=5" -Headers $h -TimeoutSec 5
Check "List prescriptions" $r "prescriptions"

# 7. Dashboard
Write-Host "`n-- Dashboard --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/api/dashboard/stats" -Headers $h -TimeoutSec 5
Check "Dash stats (doctor)" $r "appointmentsToday"
$r = Invoke-RestMethod "$BASE/api/dashboard/stats" -Headers $rh -TimeoutSec 5
Check "Dash stats (receptionist)" $r "appointmentsToday"

# 8. AI
Write-Host "`n-- AI Symptom Checker --" -ForegroundColor Yellow
$r = Invoke-RestMethod "$BASE/api/ai/symptom-check" -Method POST -Headers $h -ContentType "application/json" -Body '{"symptoms":"headache fever","patientAge":30,"patientGender":"male","medicalHistory":"none"}' -TimeoutSec 15
Check "AI symptom check" $r "analysis"

# 9. PDF
Write-Host "`n-- PDF --" -ForegroundColor Yellow
try {
  $r2 = Invoke-RestMethod "$BASE/api/prescriptions?limit=1" -Headers $h -TimeoutSec 5
  if ($r2.data.prescriptions -and $r2.data.prescriptions[0]) {
    $rxId = $r2.data.prescriptions[0]._id
    $resp = Invoke-WebRequest "$BASE/api/prescriptions/$rxId/pdf" -Headers $h -TimeoutSec 10
    if ($resp.RawContentLength -gt 1000 -and $resp.Headers["Content-Type"] -match "pdf") {
      Write-Host "  OK PDF download" -ForegroundColor Green; $pass++
    } else {
      Write-Host "  FAIL PDF download" -ForegroundColor Red; $fail++
    }
  } else {
    Write-Host "  SKIP PDF (no prescriptions)" -ForegroundColor Gray; $pass++
  }
} catch {
  Write-Host "  FAIL PDF download: $_" -ForegroundColor Red; $fail++
}

Write-Host "`n=================================" -ForegroundColor Cyan
Write-Host "Passed: $pass  Failed: $fail" -ForegroundColor $(if ($fail -eq 0){"Green"}else{"Red"})
if ($fail -eq 0) { Write-Host "ALL TESTS PASSED" -ForegroundColor Green }
