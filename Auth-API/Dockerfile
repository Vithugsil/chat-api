FROM php:8.2-cli

# Instala as extensões PDO MySQL necessárias
RUN docker-php-ext-install pdo pdo_mysql

# Define o diretório de trabalho
WORKDIR /app

# Copia seu arquivo PHP para dentro do container
COPY . /app

# Expõe a porta que o servidor PHP vai usar
EXPOSE 8000

# Comando para iniciar o servidor embutido do PHP
CMD ["php", "-S", "0.0.0.0:8000", "Index.php"]
