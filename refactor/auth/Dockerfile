FROM php:8.1-cli

WORKDIR /var/www/html

# Instalar dependências básicas
RUN apt-get update && apt-get install -y git unzip libssl-dev libcurl4-openssl-dev && docker-php-ext-install sockets

# Copiar o Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copiar apenas arquivos do composer antes de instalar
COPY composer.json .
RUN composer install

# Agora copiar o restante dos arquivos
COPY . .

EXPOSE 80
CMD ["php", "-S", "0.0.0.0:80", "index.php"]
