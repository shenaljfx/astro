<#
Smoke test for Grahachara backend + durable worker.

What it checks:
1. Backend health endpoint is responding.
2. Bearer token is valid against an authenticated endpoint.
3. AI report endpoint can enqueue a durable worker job.
4. Worker picks up and completes the queued job by polling report progress.

Usage:
  powershell -ExecutionPolicy Bypass -File .\server\scripts\check-backend-worker.ps1

Optional override:
  powershell -ExecutionPolicy Bypass -File .\server\scripts\check-backend-worker.ps1 -Token "YOUR_TOKEN"

Notes:
- The worker must be running in another terminal: cd server ; npm run worker
- The server must be running: cd server ; npm run dev
- The report job check needs Firestore and either active subscription or MOCK_PAYMENTS=true.
#>

[CmdletBinding()]
param(
  [string]$ApiUrl = "http://localhost:3000",
  # Local-only hard-coded token. Do not commit this file with a real token.
  [string]$Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJsb2NhbC1zbW9rZS10ZXN0LXVzZXIiLCJlbWFpbCI6ImxvY2FsLXNtb2tlLXRlc3RAZ3JhaGFjaGFyYS50ZXN0IiwidHlwZSI6Imdvb2dsZS1hdXRoIiwiaWF0IjoxNzc4MjYwNDc3LCJleHAiOjE3NzgyNjQwNzd9.PQhTsiq4pI6NZ7ChCUp5mRW5wrow99FMoRopC4mKOu8",
  [string]$BirthDate = "1998-10-09T09:16:00+05:30",
  [double]$Lat = 6.9271,
  [double]$Lng = 79.8612,
  [string]$Language = "en",
  [string]$BirthLocation = "Colombo",
  [string]$UserName = "Worker Smoke Test",
  [int]$PollIntervalSeconds = 5,
  [int]$TimeoutSeconds = 180,
  [switch]$SkipWorkerJob
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Message)
  Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-WarnLine {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
  param([string]$Message)
  Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function ConvertTo-PrettyJson {
  param($Value)
  if ($null -eq $Value) { return "" }
  try { return ($Value | ConvertTo-Json -Depth 20) }
  catch { return [string]$Value }
}

function Read-ErrorResponseBody {
  param($Exception)

  try {
    $response = $Exception.Response
    if ($null -eq $response) { return $Exception.Message }

    $stream = $response.GetResponseStream()
    if ($null -eq $stream) { return $Exception.Message }

    $reader = New-Object System.IO.StreamReader($stream)
    return $reader.ReadToEnd()
  } catch {
    return $Exception.Message
  }
}

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers = @{},
    $Body = $null
  )

  $request = @{
    Method = $Method
    Uri = $Url
    UseBasicParsing = $true
    Headers = $Headers
  }

  if ($null -ne $Body) {
    $request.ContentType = "application/json"
    $request.Body = ($Body | ConvertTo-Json -Depth 20)
  }

  try {
    $response = Invoke-WebRequest @request
    $parsedBody = $null

    if ($response.Content) {
      try { $parsedBody = $response.Content | ConvertFrom-Json }
      catch { $parsedBody = $response.Content }
    }

    return [pscustomobject]@{
      Ok = $true
      StatusCode = [int]$response.StatusCode
      Body = $parsedBody
      RawBody = $response.Content
      Error = $null
    }
  } catch [System.Net.WebException] {
    $statusCode = 0
    $rawBody = Read-ErrorResponseBody $_.Exception
    $parsedBody = $rawBody

    if ($_.Exception.Response) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($rawBody) {
      try { $parsedBody = $rawBody | ConvertFrom-Json }
      catch { $parsedBody = $rawBody }
    }

    return [pscustomobject]@{
      Ok = $false
      StatusCode = $statusCode
      Body = $parsedBody
      RawBody = $rawBody
      Error = $_.Exception.Message
    }
  }
}

function Stop-WithResponse {
  param(
    [string]$Message,
    $Response,
    [int]$ExitCode = 1
  )

  Write-Fail $Message
  if ($null -ne $Response) {
    Write-Host "Status: $($Response.StatusCode)"
    Write-Host "Response:"
    Write-Host (ConvertTo-PrettyJson $Response.Body)
  }
  exit $ExitCode
}

$ApiUrl = $ApiUrl.TrimEnd("/")
$headers = @{}

if (-not [string]::IsNullOrWhiteSpace($Token)) {
  $headers.Authorization = "Bearer $Token"
}

Write-Host "Grahachara backend + worker smoke test" -ForegroundColor White
Write-Host "API: $ApiUrl"

Write-Step "Checking backend health"
$health = Invoke-JsonRequest -Method "GET" -Url "$ApiUrl/api/health"
if (-not $health.Ok) {
  Stop-WithResponse "Backend health check failed. Is the server running on $ApiUrl ?" $health 1
}
Write-Ok "Backend is responding"
Write-Host (ConvertTo-PrettyJson $health.Body)

if ([string]::IsNullOrWhiteSpace($Token) -or $Token -eq "PASTE_TOKEN_HERE") {
  Write-Fail "No auth token provided. Replace the hard-coded -Token default in this script or pass -Token."
  exit 1
}

Write-Step "Checking bearer token against authenticated endpoint"
$authCheck = Invoke-JsonRequest -Method "GET" -Url "$ApiUrl/api/revenuecat/status" -Headers $headers
if (-not $authCheck.Ok) {
  Stop-WithResponse "Auth check failed. Token is missing, expired, or signed with a different JWT_SECRET." $authCheck 1
}
Write-Ok "Auth token accepted"
Write-Host (ConvertTo-PrettyJson $authCheck.Body)

if ($SkipWorkerJob) {
  Write-WarnLine "Skipping worker job check because -SkipWorkerJob was provided."
  exit 0
}

Write-Step "Queueing durable AI report job"
$jobBody = @{
  birthDate = $BirthDate
  lat = $Lat
  lng = $Lng
  language = $Language
  birthLocation = $BirthLocation
  userName = $UserName
  forceRegenerate = $true
}

$queue = Invoke-JsonRequest -Method "POST" -Url "$ApiUrl/api/horoscope/full-report-ai" -Headers $headers -Body $jobBody
if (-not $queue.Ok) {
  if ($queue.StatusCode -eq 402) {
    Write-WarnLine "Backend auth worked, but subscription gate blocked the report job."
    Write-WarnLine "For local testing, set MOCK_PAYMENTS=true in server/.env and restart the backend."
  }
  Stop-WithResponse "Could not queue worker job." $queue 1
}

$reportId = $queue.Body.reportId
$jobId = $queue.Body.jobId
if ([string]::IsNullOrWhiteSpace($reportId)) {
  Stop-WithResponse "Queue response did not include reportId." $queue 1
}

Write-Ok "Job queued"
Write-Host "reportId: $reportId"
Write-Host "jobId: $jobId"
Write-Host (ConvertTo-PrettyJson $queue.Body)

Write-Step "Polling worker progress"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$lastStage = $null

while ((Get-Date) -lt $deadline) {
  $progress = Invoke-JsonRequest -Method "GET" -Url "$ApiUrl/api/horoscope/report-progress/$reportId" -Headers $headers
  if (-not $progress.Ok) {
    Stop-WithResponse "Progress polling failed." $progress 1
  }

  $stage = [string]$progress.Body.stage
  if ($stage -ne $lastStage) {
    Write-Host ("Stage: {0} | sections {1}/{2} | jobId: {3}" -f $stage, $progress.Body.sectionsDone, $progress.Body.sectionsTotal, $progress.Body.jobId)
    $lastStage = $stage
  } else {
    Write-Host "." -NoNewline
  }

  if ($stage -eq "complete") {
    Write-Host ""
    Write-Ok "Worker completed the report job"
    Write-Host "savedReportId: $($progress.Body.savedReportId)"
    Write-Host (ConvertTo-PrettyJson $progress.Body)
    exit 0
  }

  if ($stage -eq "failed" -or $stage -eq "error") {
    Write-Host ""
    Stop-WithResponse "Worker job failed." $progress 1
  }

  Start-Sleep -Seconds $PollIntervalSeconds
}

Write-Host ""
Write-Fail "Timed out waiting for worker after $TimeoutSeconds seconds."
Write-WarnLine "If stage stayed queued, start the worker in another terminal: cd server ; npm run worker"
exit 2