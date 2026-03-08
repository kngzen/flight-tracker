from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://flighttracker:changeme@db:5432/flighttracker"
    secret_key: str = "changeme-super-secret-key-32chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    admin_username: str = "admin"
    admin_password: str = "changeme"

    class Config:
        env_file = ".env"


settings = Settings()
