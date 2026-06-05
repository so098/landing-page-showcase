# 보안그룹 — 최소 노출 체인: 인터넷 → ALB → ECS 태스크 → RDS

# ALB: 인터넷에서 HTTP/HTTPS 수신
resource "aws_security_group" "alb" {
  name        = "${var.project}-alb"
  description = "ALB ingress 80/443 from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-alb" }
}

# ECS 태스크: ALB에서만 컨테이너 포트(4000) 수신, 아웃바운드 전체 허용
resource "aws_security_group" "ecs" {
  name        = "${var.project}-ecs"
  description = "ECS tasks: ingress from ALB only, egress all"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "from ALB to container port"
    from_port       = 4000
    to_port         = 4000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "${var.project}-ecs" }
}

# RDS: ECS 태스크에서만 5432 수신 (인터넷 비노출)
resource "aws_security_group" "rds" {
  name        = "${var.project}-rds"
  description = "RDS: ingress 5432 from ECS only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from ECS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  tags = { Name = "${var.project}-rds" }
}
