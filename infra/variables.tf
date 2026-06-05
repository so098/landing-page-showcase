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
