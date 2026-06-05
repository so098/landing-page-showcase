# api 컨테이너 이미지 저장소(ECR). 저장 용량만 과금(소액) — Phase 1B 첫 증분.
resource "aws_ecr_repository" "api" {
  name                 = "${var.project}-api"
  image_tag_mutability = "MUTABLE"

  # 푸시할 때 이미지 취약점 스캔
  image_scanning_configuration {
    scan_on_push = true
  }
}

# 비용 위생: 태그 없는(이전 빌드) 이미지는 7일 후 자동 만료
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "태그 없는 이미지 7일 후 만료"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 7
      }
      action = { type = "expire" }
    }]
  })
}

output "ecr_repository_url" {
  description = "api 이미지를 푸시할 ECR URL"
  value       = aws_ecr_repository.api.repository_url
}
