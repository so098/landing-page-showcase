# Claude API 키 — 값은 Terraform 밖에서 넣음(코드/state에 실키 미보관)
resource "aws_ssm_parameter" "anthropic_api_key" {
  name  = "/${var.project}/ANTHROPIC_API_KEY"
  type  = "SecureString"
  value = "PLACEHOLDER" # 실제 값은 aws ssm put-parameter로 덮어씀

  lifecycle {
    ignore_changes = [value]
  }
}
