FROM php:8.2-apache

# PDO MySQL extension for the app's database layer
RUN docker-php-ext-install pdo pdo_mysql

# Apache modules used by backend/public/.htaccess (rewrite, headers for CORS)
RUN a2enmod rewrite headers

# Let .htaccess overrides work (AllowOverride All) for the whole project
RUN sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Composer, in case vendor/ needs to be (re)installed inside the container
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . /var/www/html

# Apache serves the project's backend/public as document root
ENV APACHE_DOCUMENT_ROOT=/var/www/html/backend/public
RUN sed -ri -e "s!/var/www/html!\${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/*.conf
RUN sed -ri -e "s!/var/www/!\${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN composer install --no-dev --no-interaction --optimize-autoloader || true

RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
