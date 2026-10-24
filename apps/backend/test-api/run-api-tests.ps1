#requires -Version 7.0
<#
.SYNOPSIS
  Chạy test end-to-end các API /attempts và /assessments bằng curl.

.DESCRIPTION
  Yêu cầu:
    - Backend đang chạy (mặc định http://localhost:3000/api)
    - Đã chạy: npm run seed

  Script sẽ gọi lần lượt từng API, in ra lệnh curl tương ứng và PASS/FAIL.

.EXAMPLE
  pwsh ./test-api/run-api-tests.ps1
  pwsh ./test-api/run-api-tests.ps1 -BaseUrl http://127.0.0.1:3001/api
#>
[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://localhost:3000/api',
  [string]$Email = 'test.learner@vact.com',
  [string]$Password = 'Test@123'
)

$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$script:PassCount = 0
$script:FailCount = 0

function Write-Check {
  param(
    [string]$Name,
    [bool]$Condition,
    [string]$Detail = ''
  )
  if ($Condition) {
    $script:PassCount++
    Write-Host "  [PASS] $Name" -ForegroundColor Green
  } else {
    $script:FailCount++
    Write-Host "  [FAIL] $Name" -ForegroundColor Red
    if ($Detail) { Write-Host "         $Detail" -ForegroundColor DarkYellow }
  }
}

function Invoke-CurlApi {
  param(
    [ValidateSet('GET', 'POST', 'PUT', 'PATCH', 'DELETE')]
    [string]$Method,
    [string]$Path,
    [string]$Body,
    [string]$Token,
    [switch]$NoAuth
  )

  $url = "$BaseUrl$Path"
  $curlArgs = @('--silent', '--show-error', '--request', $Method, $url)
  if (-not $NoAuth -and $Token) {
    $curlArgs += @('--header', "Authorization: Bearer $Token")
  }
  if ($Body) {
    $curlArgs += @('--header', 'Content-Type: application/json', '--data-raw', $Body)
  }

  $display = "curl -X $Method `"$url`""
  if (-not $NoAuth -and $Token) {
    $display += ' -H "Authorization: Bearer $TOKEN"'
  }
  if ($Body) {
    $display += " -H `"Content-Type: application/json`" -d '$Body'"
  }
  Write-Host "`n> $display" -ForegroundColor DarkCyan

  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    $status = & curl.exe @curlArgs --output $tmp --write-out '%{http_code}'
    $raw = if (Test-Path -LiteralPath $tmp) {
      Get-Content -LiteralPath $tmp -Raw -Encoding utf8
    } else {
      ''
    }
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }

  $statusCode = 0
  [void][int]::TryParse([string]$status, [ref]$statusCode)
  Write-Host "  HTTP $statusCode" -ForegroundColor DarkGray

  $json = $null
  if ($raw -and $raw.Trim()) {
    try { $json = $raw | ConvertFrom-Json } catch { }
  }

  return [pscustomobject]@{
    Status = $statusCode
    Raw    = $raw
    Json   = $json
  }
}

function Get-CorrectOptionId {
  param([string]$QuestionId)
  $q = $script:Questions[$QuestionId]
  return @($q.options | Where-Object { $_.isCorrect })[0].id
}

function Get-WrongOptionId {
  param([string]$QuestionId)
  $q = $script:Questions[$QuestionId]
  return @($q.options | Where-Object { -not $_.isCorrect })[0].id
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " API TEST - /attempts + /assessments" -ForegroundColor Cyan
Write-Host " Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ------------------------------------------------------------
# 1. Health + auth
# ------------------------------------------------------------
$health = Invoke-CurlApi -Method GET -Path '/health' -NoAuth
Write-Check 'GET /health -> 200, DB connected' (
  $health.Status -eq 200 -and $health.Json.status -eq 'ok'
) "status=$($health.Status) body=$($health.Raw)"

$login = Invoke-CurlApi -Method POST -Path '/auth/login' -NoAuth -Body (
  @{ email = $Email; password = $Password } | ConvertTo-Json -Compress
)
Write-Check 'POST /auth/login -> 201, có accessToken' (
  $login.Status -eq 201 -and [bool]$login.Json.accessToken
) "status=$($login.Status) body=$($login.Raw)"
if (-not $login.Json.accessToken) {
  throw 'Không lấy được token. Kiểm tra tài khoản test trong seed.'
}
$Token = $login.Json.accessToken

$badLogin = Invoke-CurlApi -Method POST -Path '/auth/login' -NoAuth -Body (
  @{ email = $Email; password = 'sai-mat-khau' } | ConvertTo-Json -Compress
)
Write-Check 'POST /auth/login sai mật khẩu -> 401' ($badLogin.Status -eq 401)

# ------------------------------------------------------------
# 2. Dữ liệu nền để test
# ------------------------------------------------------------
$examList = Invoke-CurlApi -Method GET -Path '/exams' -NoAuth
Write-Check 'GET /exams -> 200, có exam-1' (
  $examList.Status -eq 200 -and @($examList.Json | Where-Object { $_.id -eq 'exam-1' }).Count -eq 1
)

$examQuestions = Invoke-CurlApi -Method GET -Path '/exams/exam-1/questions' -NoAuth
$examQuestionCount = @($examQuestions.Json).Count
Write-Check 'GET /exams/exam-1/questions -> 200, 6 câu' (
  $examQuestions.Status -eq 200 -and $examQuestionCount -eq 6
) "count=$examQuestionCount"

$script:Questions = @{}
foreach ($i in 1..6) {
  $qid = "q-$i"
  $q = Invoke-CurlApi -Method GET -Path "/questions/$qid" -NoAuth
  if ($q.Status -eq 200) { $script:Questions[$qid] = $q.Json }
}
Write-Check 'GET /questions/q-1..q-6 -> đủ 6 câu + options' (
  $script:Questions.Count -eq 6
) "count=$($script:Questions.Count)"

# Kiểm tra fixture test
$fixture = Invoke-CurlApi -Method GET -Path '/attempts/attempt-test-inprogress' -Token $Token
if ($fixture.Status -eq 404) {
  throw 'Chưa có dữ liệu test. Chạy "npm run seed" trước khi test.'
}
Write-Check 'GET /attempts/:id (fixture đang làm) -> 200, IN_PROGRESS' (
  $fixture.Status -eq 200 -and $fixture.Json.status -eq 'IN_PROGRESS' -and
  [int]$fixture.Json.remainingSeconds -gt 0
) "status=$($fixture.Status) body=$($fixture.Raw)"

$firstOption = @($fixture.Json.questions[0].options)[0]
$optionFieldNames = @($firstOption.PSObject.Properties.Name)
Write-Check 'GET /attempts/:id không lộ isCorrect khi đang làm' (
  $optionFieldNames -notcontains 'isCorrect'
) "fields=$($optionFieldNames -join ',')"

# ------------------------------------------------------------
# 3. Nhóm Placement Quiz
# ------------------------------------------------------------
$placementBody = '{"topicIds":["topic-1","topic-2"]}'
$placement = Invoke-CurlApi -Method POST -Path '/assessments/placement' -Token $Token -Body $placementBody
Write-Check 'POST /assessments/placement -> 201, 2 câu theo 2 topic' (
  $placement.Status -eq 201 -and [int]$placement.Json.totalQuestions -eq 2
) "status=$($placement.Status) body=$($placement.Raw)"

$placementId = $placement.Json.attemptId
if (-not $placementId) { throw 'POST /assessments/placement không trả attemptId' }

$placementGet = Invoke-CurlApi -Method GET -Path "/attempts/$placementId" -Token $Token
Write-Check 'GET /attempts/:id (placement) -> 200, 2 câu, chưa trả lời' (
  $placementGet.Status -eq 200 -and $placementGet.Json.status -eq 'IN_PROGRESS' -and
  [int]$placementGet.Json.answeredCount -eq 0 -and @($placementGet.Json.questions).Count -eq 2
) "status=$($placementGet.Status) body=$($placementGet.Raw)"

$q1Correct = Get-CorrectOptionId 'q-1'
$savePlacementBody = @{
  selectedOptionIds = @($q1Correct)
  timeSpent         = 12
} | ConvertTo-Json -Compress
$savePlacement = Invoke-CurlApi -Method PUT -Path "/attempts/$placementId/answers/q-1" -Token $Token -Body $savePlacementBody
Write-Check 'PUT /attempts/:id/answers/:questionId -> 200, lưu đáp án' (
  $savePlacement.Status -eq 200 -and
  (@($savePlacement.Json.selectedOptionIds) -contains $q1Correct)
) "status=$($savePlacement.Status) body=$($savePlacement.Raw)"

$invalidQuestionBody = @{
  selectedOptionIds = @((Get-CorrectOptionId 'q-6'))
  timeSpent         = 5
} | ConvertTo-Json -Compress
$invalidQuestion = Invoke-CurlApi -Method PUT -Path "/attempts/$placementId/answers/q-6" -Token $Token -Body $invalidQuestionBody
Write-Check 'PUT câu không thuộc attempt -> 404' ($invalidQuestion.Status -eq 404)

$invalidOptionBody = '{"selectedOptionIds":["khong-ton-tai"],"timeSpent":5}'
$invalidOption = Invoke-CurlApi -Method PUT -Path "/attempts/$placementId/answers/q-1" -Token $Token -Body $invalidOptionBody
Write-Check 'PUT option không thuộc câu hỏi -> 400' ($invalidOption.Status -eq 400)

$earlyResults = Invoke-CurlApi -Method GET -Path "/attempts/$placementId/results" -Token $Token
Write-Check 'GET /results khi chưa nộp -> 400' ($earlyResults.Status -eq 400)

# ------------------------------------------------------------
# 4. Attempt Management + Auto-grading
# ------------------------------------------------------------
$startBody = '{"examId":"exam-1","timeLimit":900}'
$started = Invoke-CurlApi -Method POST -Path '/attempts' -Token $Token -Body $startBody
Write-Check 'POST /attempts (exam-1) -> 201, 6 câu' (
  $started.Status -eq 201 -and [int]$started.Json.totalQuestions -eq 6
) "status=$($started.Status) body=$($started.Raw)"

$attemptId = $started.Json.attemptId
if (-not $attemptId) { throw 'POST /attempts không trả attemptId' }

$examAttempt = Invoke-CurlApi -Method GET -Path "/attempts/$attemptId" -Token $Token
Write-Check 'GET /attempts/:id (exam) -> 200, 6 câu, chưa trả lời' (
  $examAttempt.Status -eq 200 -and [int]$examAttempt.Json.total -eq 6 -and
  [int]$examAttempt.Json.answeredCount -eq 0 -and @($examAttempt.Json.questions).Count -eq 6
) "status=$($examAttempt.Status)"

$q2Wrong = Get-WrongOptionId 'q-2'
$q3Correct = @($script:Questions['q-3'].options | Where-Object { $_.isCorrect } | ForEach-Object { $_.id })

$answersToSave = @(
  @{ qid = 'q-1'; ids = @($q1Correct); time = 10 },
  @{ qid = 'q-2'; ids = @($q2Wrong); time = 10 },
  @{ qid = 'q-3'; ids = $q3Correct; time = 10 }
)
foreach ($item in $answersToSave) {
  $body = @{ selectedOptionIds = $item.ids; timeSpent = $item.time } | ConvertTo-Json -Compress -Depth 5
  $saved = Invoke-CurlApi -Method PUT -Path "/attempts/$attemptId/answers/$($item.qid)" -Token $Token -Body $body
  Write-Check "PUT đáp án $($item.qid) -> 200" ($saved.Status -eq 200)
}

$submit = Invoke-CurlApi -Method POST -Path "/attempts/$attemptId/submit" -Token $Token
Write-Check 'POST /attempts/:id/submit -> 201, score=2, weighted=3' (
  $submit.Status -eq 201 -and [double]$submit.Json.score -eq 2 -and
  [double]$submit.Json.weightedScore -eq 3 -and [int]$submit.Json.total -eq 6
) "status=$($submit.Status) body=$($submit.Raw)"

$submitAgain = Invoke-CurlApi -Method POST -Path "/attempts/$attemptId/submit" -Token $Token
Write-Check 'POST /attempts/:id/submit lần 2 -> 400' ($submitAgain.Status -eq 400)

$results = Invoke-CurlApi -Method GET -Path "/attempts/$attemptId/results" -Token $Token
$details = @($results.Json.details)
$q1Detail = @($details | Where-Object { $_.questionId -eq 'q-1' })[0]
$q2Detail = @($details | Where-Object { $_.questionId -eq 'q-2' })[0]
$q4Detail = @($details | Where-Object { $_.questionId -eq 'q-4' })[0]
Write-Check 'GET /attempts/:id/results -> 200, đủ 6 câu, chấm đúng/sai' (
  $results.Status -eq 200 -and [double]$results.Json.score -eq 2 -and
  $details.Count -eq 6 -and $q1Detail.isCorrect -eq $true -and
  $q2Detail.isCorrect -eq $false -and $q4Detail.isCorrect -eq $false -and
  [bool]$q1Detail.explanation
) "status=$($results.Status) details=$($details.Count)"

$analysis = Invoke-CurlApi -Method GET -Path "/attempts/$attemptId/analysis" -Token $Token
$topics = @($analysis.Json.topicAnalysis)
$topicLimit = @($topics | Where-Object { $_.name -eq 'Toán - Giới hạn' })[0]
$topicDerivative = @($topics | Where-Object { $_.name -eq 'Toán - Đạo hàm' })[0]
Write-Check 'GET /attempts/:id/analysis -> 200, thống kê theo topic' (
  $analysis.Status -eq 200 -and $topics.Count -eq 6 -and
  [int]$topicLimit.correct -eq 1 -and [int]$topicLimit.total -eq 1 -and
  [int]$topicDerivative.correct -eq 0 -and [int]$topicDerivative.total -eq 1
) "status=$($analysis.Status) topics=$($topics.Count)"

$history = Invoke-CurlApi -Method GET -Path '/attempts/history' -Token $Token
$historyIds = @($history.Json | ForEach-Object { $_.id })
Write-Check 'GET /attempts/history -> 200, có attempt vừa nộp' (
  $history.Status -eq 200 -and $historyIds -contains $attemptId
) "status=$($history.Status) count=$($historyIds.Count)"

# ------------------------------------------------------------
# 5. Phân quyền + lỗi
# ------------------------------------------------------------
$noToken = Invoke-CurlApi -Method GET -Path '/attempts/history' -NoAuth
Write-Check 'GET /attempts/history không token -> 401' ($noToken.Status -eq 401)

$noTokenResults = Invoke-CurlApi -Method GET -Path "/attempts/$attemptId/results" -NoAuth
Write-Check 'GET /results không token -> 401' ($noTokenResults.Status -eq 401)

$otherLogin = Invoke-CurlApi -Method POST -Path '/auth/login' -NoAuth -Body (
  @{ email = 'learner@vact.com'; password = 'learner123' } | ConvertTo-Json -Compress
)
Write-Check 'POST /auth/login (user khác) -> 201' ($otherLogin.Status -eq 201)

$otherUserView = Invoke-CurlApi -Method GET -Path "/attempts/$attemptId" -Token $otherLogin.Json.accessToken
Write-Check 'GET attempt của user khác -> 404' ($otherUserView.Status -eq 404)

$notFound = Invoke-CurlApi -Method GET -Path '/attempts/attempt-khong-ton-tai' -Token $Token
Write-Check 'GET /attempts/:id không tồn tại -> 404' ($notFound.Status -eq 404)

$badTimeLimit = Invoke-CurlApi -Method POST -Path '/attempts' -Token $Token -Body '{"examId":"exam-1","timeLimit":0}'
Write-Check 'POST /attempts timeLimit=0 -> 400' ($badTimeLimit.Status -eq 400)

# ------------------------------------------------------------
# 6. Hết giờ: GET tự nộp
# ------------------------------------------------------------
$expired = Invoke-CurlApi -Method GET -Path '/attempts/attempt-test-expired' -Token $Token
Write-Check 'GET attempt quá hạn -> tự nộp (SUBMITTED)' (
  $expired.Status -eq 200 -and $expired.Json.status -eq 'SUBMITTED' -and
  [int]$expired.Json.remainingSeconds -eq 0
) "status=$($expired.Status) body=$($expired.Raw)"

$expiredResults = Invoke-CurlApi -Method GET -Path '/attempts/attempt-test-expired/results' -Token $Token
Write-Check 'GET /results sau khi tự nộp -> 200' (
  $expiredResults.Status -eq 200 -and [int]$expiredResults.Json.total -eq 2
)

# Dọn dẹp attempt placement còn IN_PROGRESS (nộp bài)
$placementSubmit = Invoke-CurlApi -Method POST -Path "/attempts/$placementId/submit" -Token $Token
Write-Check 'POST submit placement (cleanup) -> 201' ($placementSubmit.Status -eq 201)

# ------------------------------------------------------------
# Tổng kết
# ------------------------------------------------------------
$total = $script:PassCount + $script:FailCount
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " KẾT QUẢ: $($script:PassCount)/$total PASS, $($script:FailCount) FAIL" -ForegroundColor $(
  if ($script:FailCount -eq 0) { 'Green' } else { 'Red' }
)
Write-Host "============================================================" -ForegroundColor Cyan

if ($script:FailCount -gt 0) { exit 1 }
