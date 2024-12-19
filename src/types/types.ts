export type UserLoginVO = {
    account?: string
    password?: string
    phoneNumber?: string
    verificationCode?: string
}

export type UserInfoVo = {
    name: string
}

export type UserPasswordEditDto = {
    verificationCode: string,
    oldPassword: string
    newPassword: string
    twoPassword: string
}
