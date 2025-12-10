## Aggregator 说明

opensea-index.service aggregator opensea 入口，主要方便管理aggregator-opensea相关功能。 主要包括如下：

- 程序启动调用获取数据库中监控collections, 并启动 open sea stream 监控链接
- 程序启动调用获取监控collecitons对应的best listing order,并记录到数据库中
- 每个四小时抓取opensea ranking数据，并录入到数据库中
- 每个5分钟检测监控colleciton，并根据需要导入相应的collection
- 每个5分钟检查数据库中colleciton，根据需要取消和新增订阅事件
- 每个5分钟检测wss中断记录，根据情况补齐相应事件


### 记录

**某些collection频繁创建大量listing订单**

发现有些collection会频繁发出listing信息 。 不知道是他们用户故意弄的还是opensea的问题 。 这些listing 的order-hash 不一致，但是价格几乎是一样的，时间相隔很近。

比如这是某个nft的相邻的两个listing事件， 时间戳相差1s， 价格一样，但是order-hash 不一样。 所以就我们系统创建多个订单。 昨天测试的发现，有的一个nft 来自opensea的订单1700多个，检索最佳订单的时候，耗时高达20s， sql禁止子查询之后，控制在1s之内了。但是还是有性能隐患

```text
curl --request GET \
     --url 'https://api.opensea.io/api/v2/events/chain/matic/contract/0xe28d2d8746d855251ba677a91626009cb33aa4f9/nfts/23216?event_type=listing' \
     --header 'accept: application/json' \
     --header 'x-api-key: 876d280f39044f69aa1b2ed97d9253f7'
```

**取消opensea collection监控同时关闭关联来自opensea的订单**

关闭collection相关的opensea订单, 同时更新相应NFT的最佳订单数据。避免重复调用，该任务30分钟内最多执行一次

新增collection监控字段deleted字段，用来标记需要删除的colleciton（手动：在db中标记该字段为true，被动：crawl爬虫自动更新该字段）；同时新增定时任务（5分钟），用来处理标记deleted的colleciton（上述1的逻辑）
