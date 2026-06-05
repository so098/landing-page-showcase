# api.<domain> HTTPS 인증서 — ACM, DNS 검증. ALB와 동일 리전(ap-northeast-2) 필요.
# DNS가 GoDaddy(수동)라 검증 CNAME은 사용자가 직접 추가한다(Route53 자동생성 불가).
resource "aws_acm_certificate" "api" {
  domain_name       = "api.${var.domain}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# GoDaddy에 추가할 검증용 CNAME(이름/타입/값)
# 인증서가 ISSUED 될 때까지 대기(검증 CNAME은 GoDaddy 수동 추가). HTTPS 리스너의 선행.
resource "aws_acm_certificate_validation" "api" {
  certificate_arn = aws_acm_certificate.api.arn
}

output "acm_validation_record" {
  description = "이 CNAME을 GoDaddy DNS에 추가하면 ACM이 검증된다"
  value = [
    for o in aws_acm_certificate.api.domain_validation_options : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}
