import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
} from 'sequelize-typescript';

export class ApiLog extends Model<ApiLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column({ type: DataType.STRING, allowNull: true, field: 'method' })
  method: string;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'status_code' })
  statusCode: number;

  @Column({ type: DataType.STRING })
  url: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'params' })
  params: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'query' })
  query: string;

  @Column({ type: DataType.TEXT, allowNull: true, field: 'body' })
  body: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'ip' })
  ip: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'area' })
  area: string;

  @Column({ type: DataType.DATE, allowNull: true, field: 'start_time' })
  startTime: Date;

  @Column({ type: DataType.DATE, allowNull: true, field: 'response_time' })
  responseTime: Date;

  @Column({ type: DataType.INTEGER, allowNull: true, field: 'duration' })
  duration: number;

  @Column({ type: DataType.STRING, allowNull: true, field: 'lootex_username' })
  lootexUsername: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'api_key' })
  apiKey: string;

  @Column({ type: DataType.STRING, allowNull: true, field: 'error_message' })
  errorMessage: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'created_at',
    type: DataType.TIME(),
  })
  createdAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'updated_at',
    type: DataType.TIME(),
  })
  updatedAt: string;
}

@Table({
  tableName: 'api_log_dev',
  timestamps: true, // 如果需要 `createdAt` 和 `updatedAt`，可以設為 true
})
export class ApiLogDev extends ApiLog {
  //   CREATE TABLE api_log_dev (
  //     id SERIAL PRIMARY KEY, -- 自動增長主鍵
  //     method VARCHAR(255), -- 請求方法
  //     status_code INT, -- 狀態碼
  //     url VARCHAR NOT NULL, -- 請求的 URL
  //     params TEXT, -- 請求的參數
  //     query TEXT, -- 查詢字串
  //     body TEXT, -- 請求體
  //     ip VARCHAR(45) NOT NULL, -- 用戶的 IP (IPv6 最大長度為 45)
  //     area VARCHAR(255), -- 地區資訊
  //     start_time TIMESTAMP, -- 請求開始時間
  //     response_time TIMESTAMP, -- 回應時間
  //     duration INT, -- 請求耗時（毫秒）
  //     lootex_username VARCHAR(255), -- 用戶名
  //     api_key VARCHAR(255), -- x-api-key
  //     error_message TEXT, -- 錯誤訊息
  //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 創建時間
  //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 更新時間
  // );
  // -- 為 start_time 建立索引，優化按時間範圍查詢
  // CREATE INDEX idx_api_log_dev_start_time ON api_log_dev (start_time);
  // -- 為 response_time 建立索引
  // CREATE INDEX idx_api_log_dev_response_time ON api_log_dev (response_time);
  // -- 為 method 建立索引，優化按請求方法查詢
  // CREATE INDEX idx_api_log_dev_method ON api_log_dev (method);
  // -- 為 status_code 建立索引，優化按狀態碼查詢
  // CREATE INDEX idx_api_log_dev_status_code ON api_log_dev (status_code);
  // -- 為 ip 建立索引，優化按 IP 查詢
  // CREATE INDEX idx_api_log_dev_ip ON api_log_dev (ip);
  // -- 為 url 建立索引，優化按 URL 查詢
  // CREATE INDEX idx_api_log_dev_url ON api_log_dev (url);
  // -- 為 api_key 建立索引，優化按 API key 查詢
  // CREATE INDEX idx_api_log_dev_api_key ON api_log_dev (api_key);
  // -- 為 lootex_username 建立索引，優化按用戶名查詢
  // CREATE INDEX idx_api_log_dev_lootex_username ON api_log_dev (lootex_username);
}

@Table({
  tableName: 'api_log_pro',
  timestamps: true, // 如果需要 `createdAt` 和 `updatedAt`，可以設為 true
})
export class ApiLogPro extends ApiLog {
  //   CREATE TABLE api_log_pro (
  //     id SERIAL PRIMARY KEY, -- 自動增長主鍵
  //     method VARCHAR(255), -- 請求方法
  //     status_code INT, -- 狀態碼
  //     url VARCHAR NOT NULL, -- 請求的 URL
  //     params TEXT, -- 請求的參數
  //     query TEXT, -- 查詢字串
  //     body TEXT, -- 請求體
  //     ip VARCHAR(45) NOT NULL, -- 用戶的 IP (IPv6 最大長度為 45)
  //     area VARCHAR(255), -- 地區資訊
  //     start_time TIMESTAMP, -- 請求開始時間
  //     response_time TIMESTAMP, -- 回應時間
  //     duration INT, -- 請求耗時（毫秒）
  //     lootex_username VARCHAR(255), -- 用戶名
  //     api_key VARCHAR(255), -- x-api-key
  //     error_message TEXT, -- 錯誤訊息
  //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 創建時間
  //     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 更新時間
  // );
  // -- 為 start_time 建立索引，優化按時間範圍查詢
  // CREATE INDEX idx_api_log_pro_start_time ON api_log_pro (start_time);
  // -- 為 response_time 建立索引
  // CREATE INDEX idx_api_log_pro_response_time ON api_log_pro (response_time);
  // -- 為 method 建立索引，優化按請求方法查詢
  // CREATE INDEX idx_api_log_pro_method ON api_log_pro (method);
  // -- 為 status_code 建立索引，優化按狀態碼查詢
  // CREATE INDEX idx_api_log_pro_status_code ON api_log_pro (status_code);
  // -- 為 ip 建立索引，優化按 IP 查詢
  // CREATE INDEX idx_api_log_pro_ip ON api_log_pro (ip);
  // -- 為 url 建立索引，優化按 URL 查詢
  // CREATE INDEX idx_api_log_pro_url ON api_log_pro (url);
  // -- 為 api_key 建立索引，優化按 API key 查詢
  // CREATE INDEX idx_api_log_pro_api_key ON api_log_pro (api_key);
  // -- 為 lootex_username 建立索引，優化按用戶名查詢
  // CREATE INDEX idx_api_log_pro_lootex_username ON api_log_pro (lootex_username);
}
