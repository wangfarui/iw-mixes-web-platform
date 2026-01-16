import request from "@/api/request";
import type * as PointsType from "@/types/points";

// 积分记录分页列表
export const queryPointsRecordsPage = (pointsRecordsPageDto: PointsType.PointsRecordsPageDto) => {
    return request.post('/points-service/points/records/page', pointsRecordsPageDto);
}

