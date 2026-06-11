# =============================================
# PERFIL POWERSHELL - AUTO COMPLETE E HISTÓRICO
# =============================================

# ---------- PSReadLine: Auto Complete e Histórico ----------

# Ativa sugestões baseadas no histórico (aparecem em cinza enquanto digita)
Set-PSReadLineOption -PredictionSource History

# Estilo das sugestões: InlineView (na mesma linha) ou ListView (lista abaixo)
Set-PSReadLineOption -PredictionViewStyle InlineView

# Habilita sensibilidade a maiúsculas/minúsculas no completion
Set-PSReadLineOption -HistorySearchCursorMovesToEnd

# Seta para cima: busca no histórico comandos que começam com o texto digitado
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward

# Seta para baixo: navega para frente no histórico filtrado
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward

# Tab: mostra menu de completions quando ambíguo
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete

# Shift+Tab: volta no menu de completions
Set-PSReadLineKeyHandler -Key Shift+Tab -Function TabCompletePrevious

# Ctrl+Space: força completion padrão
Set-PSReadLineKeyHandler -Key Ctrl+Spacebar -Function Complete

# ---------- Configurações de Histórico ----------

# Tamanho máximo do histórico salvo em disco
Set-PSReadLineOption -MaximumHistoryCount 20000

# Salva histórico incrementalmente (após cada comando)
Set-PSReadLineOption -HistorySaveStyle SaveIncrementally

# Evita salvar comandos duplicados consecutivos
Set-PSReadLineOption -DuplicatesOrErrorAction Ignore

# Ignora comandos simples no histórico (não salva)
$PSReadLineOptions = @{
    AddToHistoryHandler = {
        param([string]$line)
        $ignoredCommands = @('ls', 'll', 'dir', 'cd', 'pwd', 'clear', 'cls', 'exit', 'h')
        $trimmed = $line.Trim()
        if ($trimmed -in $ignoredCommands) { return $false }
        if ($trimmed.StartsWith(' ')) { return $false }  # não salva comandos com espaço no início
        return $true
    }
}
Set-PSReadLineOption @PSReadLineOptions

# ---------- Cores e Aparência ----------

# Cores customizadas do PSReadLine
Set-PSReadLineOption -Colors @{
    Command            = 'Green'
    Parameter          = 'Cyan'
    Operator           = 'DarkYellow'
    Variable           = 'Yellow'
    String             = 'DarkCyan'
    Number             = 'Magenta'
    Type               = 'DarkGreen'
    Comment            = 'DarkGray'
    Keyword            = 'Blue'
    Member             = 'DarkCyan'
    InlinePrediction   = 'DarkGray'   # cor da sugestão do histórico
}

# Prompt colorido [usuário@host diretorio]>
function prompt {
    $user = $env:USERNAME
    $hostName = $env:COMPUTERNAME
    $location = (Get-Location).Path.Replace($HOME, '~')
    Write-Host "$user@$hostName" -NoNewline -ForegroundColor Green
    Write-Host ":" -NoNewline
    Write-Host $location -NoNewline -ForegroundColor Blue
    return '>'
}

# ---------- Aliases Úteis ----------

Set-Alias -Name ll -Value Get-ChildItem
Set-Alias -Name la -Value Get-ChildItem
function l { Get-ChildItem }
function .. { Set-Location .. }
function ... { Set-Location ../.. }
function h { Get-History | Select-Object -Last 50 }
function c { Clear-Host }

# ---------- Completions Nativos ----------

# Se estiver usando winget, ativa completions
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Register-ArgumentCompleter -Native -CommandName winget -ScriptBlock {
        param($wordToComplete, $commandAst, $cursorPosition)
        [Console]::InputEncoding = [Console]::OutputEncoding = $OutputEncoding
        $Local:word = $wordToComplete.Replace('"', '""')
        $Local:ast = $commandAst.ToString().Replace('"', '""')
        winget complete --word="$Local:word" --commandline "$Local:ast" --position $cursorPosition | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    }
}

# Se estiver usando npm, ativa completions
if (Get-Command npm -ErrorAction SilentlyContinue) {
    $npmCompletion = {
        param($wordToComplete, $commandAst, $cursorPosition)
        $npmCommands = @('install', 'start', 'build', 'test', 'run', 'dev', 'lint', 'audit', 'update', 'uninstall', 'publish')
        $npmCommands | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_)
        }
    }
    Register-ArgumentCompleter -Native -CommandName npm -ScriptBlock $npmCompletion
}
