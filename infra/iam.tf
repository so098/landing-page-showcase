# ECS 태스크용 IAM 역할

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# 실행 역할 — ECS 에이전트가 ECR 풀 / CloudWatch 로그 작성 / 시크릿 주입
resource "aws_iam_role" "ecs_execution" {
  name               = "${var.project}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# DATABASE_URL(SSM SecureString)을 secret으로 주입하기 위한 읽기 권한
data "aws_iam_policy_document" "ssm_read" {
  statement {
    actions   = ["ssm:GetParameters"]
    resources = [aws_ssm_parameter.database_url.arn, aws_ssm_parameter.anthropic_api_key.arn]
  }
}

resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name   = "${var.project}-ssm-read"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ssm_read.json
}

# 태스크(앱) 역할 — 현재 앱은 AWS API를 직접 호출하지 않으므로 비워둠(필요 시 확장)
resource "aws_iam_role" "ecs_task" {
  name               = "${var.project}-ecs-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

# 생성 랜딩 S3 입출력 (assets 버킷의 generated-landings/* )
data "aws_iam_policy_document" "ecs_task_s3" {
  statement {
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.assets.arn}/generated-landings/*"]
  }
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name   = "${var.project}-task-s3"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_s3.json
}
