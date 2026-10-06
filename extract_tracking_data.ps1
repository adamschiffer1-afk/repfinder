$codes = @("CB778690537DE", "CB775425657DE", "05163002587986", "CR432471625DE")

foreach ($code in $codes) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "PACZKA: $code" -ForegroundColor Yellow
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    try {
        $body = "documentCode=$code"
        $response = Invoke-WebRequest -Uri "http://111.231.71.230:8082/trackIndex.htm" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded" -TimeoutSec 15
        
        # Extract tracking events using regex
        $pattern = '<tr>\s*<td[^>]*>\s*([\d\-\s:]+)</td>\s*<td[^>]*>\s*([^<]*)</td>\s*<td[^>]*>\s*([^<]+)</td>'
        $matches = [regex]::Matches($response.Content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
        
        if ($matches.Count -gt 0) {
            Write-Host "✅ Znaleziono $($matches.Count) zdarzeń trackingowych`n" -ForegroundColor Green
            
            $eventNumber = 1
            foreach ($match in $matches) {
                $date = $match.Groups[1].Value.Trim()
                $location = $match.Groups[2].Value.Trim()
                $status = $match.Groups[3].Value.Trim()
                
                if ($date -and $status) {
                    Write-Host "[$eventNumber] ⏰ $date" -ForegroundColor White
                    Write-Host "    📍 Lokalizacja: $location" -ForegroundColor Cyan
                    Write-Host "    📌 Status: $status" -ForegroundColor Yellow
                    Write-Host ""
                    $eventNumber++
                }
            }
        } else {
            Write-Host "❌ Nie znaleziono zdarzeń trackingowych" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ BŁĄD: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 2
}
