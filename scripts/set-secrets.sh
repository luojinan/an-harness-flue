#!/usr/bin/env bash
#
# 通过 wrangler CLI 把敏感凭据注入到 Cloudflare Worker（生产环境）。
#
# 安全设计：本脚本不包含任何密钥值，运行时按以下顺序取值：
#   1. 当前 shell 环境变量（推荐，避免密钥落盘到脚本/命令历史）
#   2. 项目根目录的 .dev.vars（本地开发兜底，该文件已被 .gitignore 忽略）
#
# 用法：
#   # 方式一：让脚本自动从 .dev.vars 读取（本地最方便）
#   ./scripts/set-secrets.sh
#
#   # 方式二：显式用环境变量注入（CI / 生产）
#   OPENAI_API_KEY=... \
#   SUPABASE_ACCESS_TOKEN=... \
#   ALIYUN_ACCESS_KEY_ID=... \
#   ALIYUN_ACCESS_KEY_SECRET=... \
#     ./scripts/set-secrets.sh
#
#   # 只预览要注入哪些 key（值会打码），不实际请求 Cloudflare
#   ./scripts/set-secrets.sh --dry-run
#
# 前置条件：已通过 `wrangler login`（或设置 CLOUDFLARE_API_TOKEN）登录。
set -euo pipefail

cd "$(dirname "$0")/.."

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
elif [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  sed -n '2,24p' "$0"
  exit 0
fi

# 需要注入的密钥（wrangler secret put 的 key，与 Worker 运行时变量名一致）。
SECRET_KEYS=(
  OPENAI_API_KEY
  SUPABASE_ACCESS_TOKEN
  ALIYUN_ACCESS_KEY_ID
  ALIYUN_ACCESS_KEY_SECRET
)

get_secret() {
  local key="$1"

  # 1) 环境变量优先
  if [[ -n "${!key:-}" ]]; then
    printf '%s' "${!key}"
    return 0
  fi

  # 2) 回退 .dev.vars（本地开发兜底）
  if [[ -f .dev.vars ]]; then
    local value
    value="$(
      # shellcheck disable=SC1091
      source .dev.vars >/dev/null 2>&1 || true
      printf '%s' "${!key:-}"
    )"
    if [[ -n "$value" ]]; then
      printf '%s' "$value"
      return 0
    fi
  fi

  return 1
}

mask() {
  local value="$1"
  if ((${#value} <= 8)); then
    printf '%s' "$value" | sed 's/./*/g'
  else
    printf '%s****' "${value:0:4}"
  fi
}

failures=0
for key in "${SECRET_KEYS[@]}"; do
  if ! secret="$(get_secret "$key")"; then
    echo "❌ 缺少 $key —— 请 export $key=... 或在 .dev.vars 中提供" >&2
    failures=$((failures + 1))
    continue
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    printf '🔍 %s = %s (dry-run)\n' "$key" "$(mask "$secret")"
    continue
  fi

  # 非交互环境走 stdin：wrangler 会读取 stdin 作为密钥并去掉尾部空白。
  printf '%s' "$secret" | pnpm exec wrangler secret put "$key"
  echo "✅ 已注入 $key"
done

if ((failures > 0)); then
  echo "⚠️  有 $failures 个密钥缺失，未全部注入。" >&2
  exit 1
fi

echo "全部完成。可运行 \`pnpm exec wrangler secret list\` 核对。"
