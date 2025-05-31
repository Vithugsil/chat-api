USE Message;

CREATE table IF NOT EXISTS messages (
    message_id int primary key not null auto_increment,
    message varchar(255),
    user_id_send int,
    user_id_receive int,
)default charset=utf8mb4;