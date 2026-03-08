from urllib.parse import quote_plus

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = ""
    db_host: str = "db"
    db_port: int = 5432
    db_name: str = "flighttracker"
    db_user: str = "flighttracker"
    db_password: str = "changeme"
    secret_key: str = "changeme-super-secret-key-32chars"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    admin_username: str = "admin"
    admin_password: str = "changeme"

    class Config:
        env_file = ".env"

    def get_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        password = quote_plus(self.db_password)
        user = quote_plus(self.db_user)
        return f"postgresql://{user}:{password}@{self.db_host}:{self.db_port}/{self.db_name}"


settings = Settings()
