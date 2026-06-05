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

variable "domain" {
  description = "루트 도메인 (web=Vercel, api=api.<domain>=ALB)"
  type        = string
  default     = "landingpick.com"
}

variable "web_origin" {
  description = "CORS/Socket.IO 허용 출처(web). Vercel이 서비스하는 정규 도메인."
  type        = string
  default     = "https://landingpick.com"
}

variable "image_tag" {
  description = "ECS가 배포할 ECR 이미지 태그"
  type        = string
  default     = "v1"
}
