variable "region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2" # 서울
}

variable "project" {
  description = "리소스 이름 접두사 / 공통 태그"
  type        = string
  default     = "melstudio"
}

variable "web_origin" {
  description = "CORS/Socket.IO 허용 출처(web). 증분5에서 Vercel 도메인으로 갱신."
  type        = string
  default     = "http://localhost:3000"
}

variable "image_tag" {
  description = "ECS가 배포할 ECR 이미지 태그"
  type        = string
  default     = "v1"
}
