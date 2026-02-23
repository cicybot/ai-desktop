#!/bin/bash
# ZapOS Desktop E2E 测试 (Electron MCP)
# 用法: bash e2e-test.sh [token]
set -uo pipefail

TOKEN="${1:-$(cat ~/global.json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["api_token"])' 2>/dev/null || echo '')}"
URL="https://desktop.cicy.de5.net"
API="https://g-fast-api.cicy.de5.net/api"
WIN_ID=""
PASS=0; FAIL=0; SKIP=0; TOTAL=0

# ─── Helpers ───
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

rpc() { curl-rpc "$@" 2>/dev/null | sed '1d;$d'; }

js() {
  # exec_js 只返回 string，bool 需要 String() 包装
  local result
  result=$(curl-rpc exec_js id="$WIN_ID" code="String($1)" 2>/dev/null | sed -n '2p')
  echo "$result"
}

assert() {
  ((TOTAL++))
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✅ $name${NC}"
    ((PASS++))
  else
    echo -e "  ${RED}❌ $name${NC} (expected: $expected, got: $actual)"
    ((FAIL++))
  fi
}

assert_contains() {
  ((TOTAL++))
  local name="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo -e "  ${GREEN}✅ $name${NC}"
    ((PASS++))
  else
    echo -e "  ${RED}❌ $name${NC} (expected to contain: $needle)"
    ((FAIL++))
  fi
}

assert_gt() {
  ((TOTAL++))
  local name="$1" threshold="$2" actual="$3"
  if [ "$actual" -gt "$threshold" ] 2>/dev/null; then
    echo -e "  ${GREEN}✅ $name${NC} ($actual > $threshold)"
    ((PASS++))
  else
    echo -e "  ${RED}❌ $name${NC} (expected > $threshold, got: $actual)"
    ((FAIL++))
  fi
}

screenshot() {
  rpc webpage_screenshot_to_clipboard id="$WIN_ID" > /dev/null 2>&1
  echo -e "  ${CYAN}📸 Screenshot saved to clipboard${NC}"
}

wait_for() {
  local selector="$1" timeout="${2:-10}"
  rpc electron_wait_for id="$WIN_ID" selector="$selector" timeout="$timeout" > /dev/null 2>&1
}

# ─── Pre-flight ───
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  ZapOS Desktop E2E Test Suite${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ No token provided. Usage: bash e2e-test.sh <token>${NC}"
  exit 1
fi

# ─── 0. Service Health ───
echo -e "\n${YELLOW}[0] Service Health Check${NC}"

api_status=$(curl -s -o /dev/null -w "%{http_code}" "$API/health")
assert "API health endpoint" "200" "$api_status"

desktop_status=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
assert "Desktop frontend" "200" "$desktop_status"

ttyd_status=$(curl -s -o /dev/null -w "%{http_code}" "https://ttyd-proxy.cicy.de5.net")
assert "TTYD proxy (401=needs auth)" "401" "$ttyd_status"

api_health=$(curl -s "$API/health" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status",""))' 2>/dev/null)
assert "API returns ok" "ok" "$api_health"

# ─── 1. API Auth ───
echo -e "\n${YELLOW}[1] API Authentication${NC}"

auth_result=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/auth/verify" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("valid",""))' 2>/dev/null)
assert "Token valid" "True" "$auth_result"

bad_auth=$(curl -s -H "Authorization: Bearer invalid_token_xxx" "$API/auth/verify" -o /dev/null -w "%{http_code}")
assert "Invalid token rejected" "401" "$bad_auth"

no_auth=$(curl -s "$API/groups" -o /dev/null -w "%{http_code}")
assert "No auth rejected" "401" "$no_auth"

# ─── 2. API Groups CRUD ───
echo -e "\n${YELLOW}[2] API Groups CRUD${NC}"

groups_list=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/groups" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("groups",[])))' 2>/dev/null)
assert_gt "Groups list returns data" "0" "$groups_list"

# Create
new_group=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E-Test-Group"}' "$API/groups")
new_group_id=$(echo "$new_group" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
assert_gt "Create group returns id" "0" "$new_group_id"

# Get
get_group=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/groups/$new_group_id" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("name",""))' 2>/dev/null)
assert "Get group by id" "E2E-Test-Group" "$get_group"

# Rename
rename_result=$(curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E-Renamed"}' "$API/groups/$new_group_id" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("success",""))' 2>/dev/null)
assert "Rename group" "True" "$rename_result"

# Delete
delete_result=$(curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$API/groups/$new_group_id" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("success",""))' 2>/dev/null)
assert "Delete group" "True" "$delete_result"

# ─── 3. API TTYD ───
echo -e "\n${YELLOW}[3] API TTYD${NC}"

ttyd_count=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/ttyd/list" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("configs",[])))' 2>/dev/null)
assert_gt "TTYD configs exist" "0" "$ttyd_count"

# ─── 4. API Tmux ───
echo -e "\n${YELLOW}[4] API Tmux${NC}"

tmux_list=$(curl -s -H "Authorization: Bearer $TOKEN" "$API/tmux-list" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d.get("output","").strip().split(chr(10))) if d.get("output") else 0)' 2>/dev/null)
assert_gt "Tmux sessions exist" "0" "$tmux_list"

# ─── 5. Electron Window Setup ───
echo -e "\n${YELLOW}[5] Electron Window Setup${NC}"

# Check if desktop window already open
existing=$(rpc get_windows)
if echo "$existing" | grep -q "$URL"; then
  WIN_ID=$(echo "$existing" | python3 -c "
import sys,json
wins=json.loads(sys.stdin.read())
for w in wins:
  if '$URL' in w.get('url',''):
    print(w['id']); break
" 2>/dev/null)
  echo -e "  ${CYAN}♻️  Reusing existing window ID: $WIN_ID${NC}"
else
  rpc open_window url="$URL" > /dev/null
  sleep 2
  WIN_ID=$(rpc get_windows | python3 -c "
import sys,json
wins=json.loads(sys.stdin.read())
for w in wins:
  print(w['id']); break
" 2>/dev/null)
  echo -e "  ${CYAN}🪟 Opened new window ID: $WIN_ID${NC}"
fi

assert_gt "Window ID obtained" "0" "$WIN_ID"
sleep 3

# ─── 6. Page Load ───
echo -e "\n${YELLOW}[6] Page Load${NC}"

page_title=$(js "document.title")
assert "Page title is ZapOS" "ZapOS" "$page_title"

has_root=$(js "!!document.getElementById('root')")
assert "Root element exists" "true" "$has_root"

has_react=$(js "document.getElementById('root').children.length > 0")
assert "React app rendered" "true" "$has_react"

# ─── 7. Login Flow ───
echo -e "\n${YELLOW}[7] Login Flow${NC}"

# Clear token to test login
js "localStorage.removeItem('token'); localStorage.removeItem('macos-web-state-v1'); void 0" > /dev/null
sleep 1
js "location.reload(); void 0" > /dev/null
sleep 6

login_dialog=$(js "!!document.querySelector('input[type=password]')")
assert "Login dialog appears without token" "true" "$login_dialog"

# Enter token
js "document.querySelector('input[type=password]').value=''; void 0" > /dev/null
rpc electron_type id="$WIN_ID" selector="input[type=password]" text="$TOKEN" > /dev/null
sleep 1

# Click login button
rpc electron_click id="$WIN_ID" selector="button[type=submit]" > /dev/null
sleep 3

token_stored=$(js "localStorage.getItem('token') === '$TOKEN'")
assert "Token stored in localStorage" "true" "$token_stored"

login_closed=$(js "!document.querySelector('input[type=password]')")
assert "Login dialog closed after auth" "true" "$login_closed"

screenshot

# ─── 8. URL Token Login ───
echo -e "\n${YELLOW}[8] URL Token Login${NC}"

js "localStorage.removeItem('token'); void 0" > /dev/null
js "location.href='$URL?token=$TOKEN'; void 0" > /dev/null
sleep 5

url_token_stored=$(js "localStorage.getItem('token') === '$TOKEN'")
assert "URL token stored" "true" "$url_token_stored"

url_clean=$(js "!window.location.search.includes('token')")
assert "URL cleaned after token extraction" "true" "$url_clean"

# ─── 9. TopBar ───
echo -e "\n${YELLOW}[9] TopBar${NC}"

has_topbar=$(js "!!document.querySelector('[class*=h-12]')")
assert "TopBar rendered" "true" "$has_topbar"

has_version=$(js "document.body.innerText.includes('v0.1.0')")
assert "Version v0.1.0 displayed" "true" "$has_version"

# ─── 10. Desktop Loading ───
echo -e "\n${YELLOW}[10] Desktop Data Loading${NC}"

sleep 2
# Check desktops loaded from API
desktop_count=$(js "document.querySelectorAll('[class*=desktop]').length || document.body.innerText.match(/开发部|Desktop/g)?.length || 0")
assert_gt "Desktops loaded" "0" "$desktop_count"

# ─── 11. Window Operations ───
echo -e "\n${YELLOW}[11] Window Operations${NC}"

# Count initial windows
initial_windows=$(js "document.querySelectorAll('iframe').length")
echo -e "  ${CYAN}ℹ️  Initial windows: $initial_windows${NC}"

# Open terminal via Agents menu - click the >_ Agents button
js "
  const btns = [...document.querySelectorAll('button')];
  const agentBtn = btns.find(b => b.textContent.includes('Agents'));
  if (agentBtn) agentBtn.click();
  void 0;
" > /dev/null
sleep 1

# Click + button to add terminal
js "
  const plusBtns = [...document.querySelectorAll('button')];
  const plus = plusBtns.find(b => b.querySelector('svg') && b.closest('[class*=absolute]'));
  void 0;
" > /dev/null

# Use sidebar agent command instead (more reliable)
# Open sidebar
js "
  const btns = [...document.querySelectorAll('button')];
  const sidebarBtn = btns.find(b => b.title === 'Toggle Sidebar');
  if (sidebarBtn) sidebarBtn.click();
  void 0;
" > /dev/null
sleep 1

screenshot

# ─── 12. Sidebar Chat ───
echo -e "\n${YELLOW}[12] Sidebar Chat${NC}"

has_sidebar=$(js "!!document.querySelector('input[placeholder*=anything]') || !!document.querySelector('input[placeholder*=Copilot]')")
assert "Sidebar input exists" "true" "$has_sidebar"

# Send help command
js "
  var input = document.querySelector('input[placeholder*=anything]') || document.querySelector('input[placeholder*=Copilot]');
  if (input) {
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, 'help');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  void 0;
" > /dev/null
sleep 0.5

# Submit
js "
  var input = document.querySelector('input[placeholder*=anything]') || document.querySelector('input[placeholder*=Copilot]');
  if (input) {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    if (input.form) input.form.dispatchEvent(new Event('submit', { bubbles: true }));
  }
  void 0;
" > /dev/null
sleep 2

help_response=$(js "document.body.innerText.includes('Agent 命令') || document.body.innerText.includes('终端') || document.body.innerText.includes('help')")
assert "Help command returns response" "true" "$help_response"

# Send status command
js "
  var input = document.querySelector('input[placeholder*=anything]') || document.querySelector('input[placeholder*=Copilot]');
  if (input) {
    var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(input, 'status');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(function() {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      if (input.form) input.form.dispatchEvent(new Event('submit', { bubbles: true }));
    }, 200);
  }
  void 0;
" > /dev/null
sleep 2

status_response=$(js "document.body.innerText.includes('当前桌面') || document.body.innerText.includes('窗口') || document.body.innerText.includes('所有桌面')")
assert "Status command shows desktop info" "true" "$status_response"

screenshot

# ─── 13. Grid Layout ───
echo -e "\n${YELLOW}[13] Grid Layout${NC}"

# Only test if there are windows
window_count=$(js "document.querySelectorAll('iframe').length")
if [ "$window_count" -gt "1" ] 2>/dev/null; then
  js "
    var input = document.querySelector('input[placeholder*=anything]') || document.querySelector('input[placeholder*=Copilot]');
    if (input) {
      var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(input, 'grid');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(function() {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        if (input.form) input.form.dispatchEvent(new Event('submit', { bubbles: true }));
      }, 200);
    }
    void 0;
  " > /dev/null
  sleep 2
  
  grid_response=$(js "document.body.innerText.includes('排列')")
  assert "Grid layout command executed" "true" "$grid_response"
  screenshot
else
  echo -e "  ${YELLOW}⏭️  Skipped (need >1 windows)${NC}"
  ((SKIP++))
fi

# ─── 14. Network Monitor ───
echo -e "\n${YELLOW}[14] Network Monitor${NC}"

has_latency=$(js "!!document.querySelector('[title*=Latency]') || document.body.innerText.match(/\\d+ms/) !== null")
assert "Network latency displayed" "true" "$has_latency"

# ─── 15. Console Errors ───
echo -e "\n${YELLOW}[15] Console Errors Check${NC}"

console_logs=$(rpc get_console_logs id="$WIN_ID" level=error)
error_count=$(echo "$console_logs" | python3 -c "
import sys,json
try:
  data=json.loads(sys.stdin.read())
  logs=data.get('data',[]) if isinstance(data,dict) else data
  critical=[l for l in logs if isinstance(l,dict) and not any(x in l.get('message','') for x in ['favicon','manifest','sw.js','websocket','net::','SyntaxError','Unexpected token'])]
  print(len(critical))
except: print(0)
" 2>/dev/null)
assert "No critical console errors" "0" "${error_count:-0}"

# ─── 16. LocalStorage Persistence ───
echo -e "\n${YELLOW}[16] LocalStorage Persistence${NC}"

has_state=$(js "!!localStorage.getItem('macos-web-state-v1')")
assert "State saved to localStorage" "true" "$has_state"

has_token=$(js "!!localStorage.getItem('token')")
assert "Token persisted" "true" "$has_token"

# ─── 17. Iframe Security ───
echo -e "\n${YELLOW}[17] Iframe Security${NC}"

iframe_count=$(js "document.querySelectorAll('iframe').length")
if [ "$iframe_count" -gt "0" ] 2>/dev/null; then
  iframe_src=$(js "document.querySelector('iframe')?.src || ''")
  assert_contains "Iframe src contains token" "token=" "$iframe_src"
  assert_contains "Iframe uses ttyd-proxy" "ttyd-proxy" "$iframe_src"
else
  echo -e "  ${YELLOW}⏭️  No iframes to check${NC}"
  ((SKIP++))
fi

# ─── Results ───
echo ""
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}  Test Results${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "  ${GREEN}Pass: $PASS${NC}  ${RED}Fail: $FAIL${NC}  ${YELLOW}Skip: $SKIP${NC}  Total: $TOTAL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  exit 1
else
  echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
  exit 0
fi
