table "USER_ACCOUNT" {
  schema = schema.public

  column "USER_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "USER_EMAIL" {
    null = false
    type = sql("varchar(255)")
  }

  column "USER_PASSWORD" {
    null = true
    type = sql("text")
  }

  column "SUPABASE_USER_ID" {
    null = true
    type = sql("varchar(255)")
  }

  column "PROVIDER" {
    null = true
    type = sql("varchar(255)")
  }

  column "LAST_LOGIN" {
    null = true
    type = sql("timestamp")
  }

  column "CREATE_AT" {
    null = false
    type = sql("timestamp")
  }

  column "DELETED_AT" {
    null = true
    type = sql("timestamp")
  }

  column "UPDATE_AT" {
    null = false
    type = sql("timestamp")
  }

  column "TUTORIAL_DONE" {
    null = false
    type = sql("tinyint(1)")
  }

  column "ROLE" {
    null = false
    type = sql("enum('SuperAdmin','Admin','User')")
  }

  column "STATUS" {
    null = false
    type = sql("tinyint(1)")
  }

  column "TIME_ZONE" {
    null = true
    type = sql("varchar(255)")
  }

  primary_key {
    columns = [column.USER_ID]
  }

  index "USER_EMAIL_key" {
    unique  = true
    columns = [column.USER_EMAIL]
  }

  index "SUPABASE_USER_ID_key" {
    unique  = true
    columns = [column.SUPABASE_USER_ID]
  }
}

table "DEVICE_TOKEN" {
  schema = schema.public

  column "DEVICE_TOKEN_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "TOKEN" {
    null = false
    type = sql("varchar(255)")
  }

  column "USER_ID" {
    null = false
    type = sql("int")
  }

  column "PLATFORM" {
    null = true
    type = sql("varchar(255)")
  }

  column "DEVICE_ID" {
    null = true
    type = sql("varchar(255)")
  }

  column "LAST_SEEN_AT" {
    null = false
    type = sql("timestamp")
  }

  column "REVOKED_AT" {
    null = true
    type = sql("timestamp")
  }

  column "CREATED_AT" {
    null = false
    type = sql("timestamp")
  }

  column "UPDATED_AT" {
    null = false
    type = sql("timestamp")
  }

  primary_key {
    columns = [column.DEVICE_TOKEN_ID]
  }

  index "TOKEN_key" {
    unique  = true
    columns = [column.TOKEN]
  }

  foreign_key "DEVICE_TOKEN_USER_ID_fkey" {
    columns     = [column.USER_ID]
    ref_columns = [table.USER_ACCOUNT.column.USER_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }
}

table "USER_PROFILE" {
  schema = schema.public

  column "PROFILE_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "USER_ID" {
    null = false
    type = sql("int")
  }

  column "PROFILE_NAME" {
    null = false
    type = sql("varchar(255)")
  }

  column "PROFILE_PICTURE" {
    null = true
    type = sql("text")
  }

  primary_key {
    columns = [column.PROFILE_ID]
  }

  foreign_key "USER_PROFILE_USER_ID_fkey" {
    columns     = [column.USER_ID]
    ref_columns = [table.USER_ACCOUNT.column.USER_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }
}

table "MEDICINE_DATABASE" {
  schema = schema.public

  column "MEDI_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "MEDI_TH_NAME" {
    null = false
    type = sql("varchar(500)")
  }

  column "MEDI_EN_NAME" {
    null = false
    type = sql("varchar(500)")
  }

  column "MEDI_TRADE_NAME" {
    null = true
    type = sql("varchar(500)")
  }

  column "MEDI_TYPE" {
    null = false
    type = sql("enum('ORAL','TOPICAL')")
  }

  column "MEDI_USE" {
    null = true
    type = sql("varchar(500)")
  }

  column "MEDI_GUIDE" {
    null = true
    type = sql("varchar(500)")
  }

  column "MEDI_EFFECTS" {
    null = true
    type = sql("varchar(500)")
  }

  column "MEDI_NO_USE" {
    null = true
    type = sql("varchar(500)")
  }

  column "MEDI_WARNING" {
    null = true
    type = sql("varchar(500)")
  }

  column "MEDI_STORE" {
    null = true
    type = sql("varchar(500)")
  }

  column "MEDI_PICTURE" {
    null = true
    type = sql("varchar(500)")
  }

  column "CREATED_AT" {
    null = false
    type = sql("timestamp")
  }

  column "UPDATE_AT" {
    null = false
    type = sql("timestamp")
  }

  column "MEDI_STATUS" {
    null = false
    type = sql("tinyint(1)")
  }

  column "ADMIN_ID" {
    null = true
    type = sql("int")
  }

  primary_key {
    columns = [column.MEDI_ID]
  }
}

table "MEDICINE_LIST" {
  schema = schema.public

  column "MEDI_LIST_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "PROFILE_ID" {
    null = false
    type = sql("int")
  }

  column "MEDI_ID" {
    null = true
    type = sql("int")
  }

  column "MEDI_NICKNAME" {
    null = true
    type = sql("varchar(25)")
  }

  column "PICTURE_OPTION" {
    null = true
    type = sql("varchar(255)")
  }

  primary_key {
    columns = [column.MEDI_LIST_ID]
  }

  foreign_key "MEDI_LIST_PROFILE_ID_fkey" {
    columns     = [column.PROFILE_ID]
    ref_columns = [table.USER_PROFILE.column.PROFILE_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }

  foreign_key "MEDI_LIST_MEDI_ID_fkey" {
    columns     = [column.MEDI_ID]
    ref_columns = [table.MEDICINE_DATABASE.column.MEDI_ID]
    on_update   = CASCADE
    on_delete   = SET_NULL
  }
}

table "USER_REQUEST" {
  schema = schema.public

  column "REQUEST_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "USER_ID" {
    null = false
    type = sql("int")
  }

  column "REQUEST_TYPE" {
    null = false
    type = sql("enum('PROBLEM','ADD_MEDICINE','NOTIFICATION','FUNCTION','OTHER')")
  }

  column "REQUEST_TITLE" {
    null = false
    type = sql("varchar(255)")
  }

  column "REQUEST_DETAILS" {
    null = false
    type = sql("text")
  }

  column "STATUS" {
    null = false
    type = sql("enum('PENDING','REJECTED','DONE')")
  }

  column "ADMIN_ID" {
    null = true
    type = sql("int")
  }

  column "CREATED_AT" {
    null = false
    type = sql("timestamp")
  }

  column "UPDATED_AT" {
    null = false
    type = sql("timestamp")
  }

  column "PICTURE" {
    null = true
    type = sql("text")
  }

  primary_key {
    columns = [column.REQUEST_ID]
  }

  foreign_key "USER_REQUEST_USER_ID_fkey" {
    columns     = [column.USER_ID]
    ref_columns = [table.USER_ACCOUNT.column.USER_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }

  foreign_key "USER_REQUEST_ADMIN_ID_fkey" {
    columns     = [column.ADMIN_ID]
    ref_columns = [table.USER_ACCOUNT.column.USER_ID]
    on_update   = CASCADE
    on_delete   = SET_NULL
  }
}

table "USER_RELATIONSHIP" {
  schema = schema.public

  column "RELATIONSHIP_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "OWNER_USER_ID" {
    null = false
    type = sql("int")
  }

  column "VIEWER_USER_ID" {
    null = false
    type = sql("int")
  }

  column "IS_RECEIVER_EMAIL" {
    null = false
    type = sql("varchar(255)")
  }

  column "PROFILE_IDS" {
    null = true
    type = sql("json")
  }

  column "STATUS" {
    null = false
    type = sql("enum('PENDING','APPROVED','REJECTED','CANCELLED')")
  }

  column "VIEWER_NICKNAME" {
    null = true
    type = sql("varchar(255)")
  }

  column "VIEWER_PICTURE" {
    null = true
    type = sql("text")
  }

  column "OWNER_NICKNAME" {
    null = true
    type = sql("varchar(255)")
  }

  column "OWNER_PICTURE" {
    null = true
    type = sql("text")
  }

  column "CREATED_AT" {
    null = false
    type = sql("timestamp")
  }

  column "UPDATED_AT" {
    null = false
    type = sql("timestamp")
  }

  primary_key {
    columns = [column.RELATIONSHIP_ID]
  }

  foreign_key "USER_RELATIONSHIP_OWNER_USER_ID_fkey" {
    columns     = [column.OWNER_USER_ID]
    ref_columns = [table.USER_ACCOUNT.column.USER_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }

  foreign_key "USER_RELATIONSHIP_VIEWER_USER_ID_fkey" {
    columns     = [column.VIEWER_USER_ID]
    ref_columns = [table.USER_ACCOUNT.column.USER_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }
}

table "MEDICATION_LOG" {
  schema = schema.public

  column "LOG_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "PROFILE_ID" {
    null = false
    type = sql("int")
  }

  column "MEDI_LIST_ID" {
    null = false
    type = sql("int")
  }

  column "SCHEDULE_TIME" {
    null = false
    type = sql("timestamp")
  }

  column "IS_RECEIVED" {
    null = false
    type = sql("tinyint(1)")
  }

  column "PUSH_SENT_AT" {
    null = true
    type = sql("timestamp")
  }

  column "SUPABASE_SENT_AT" {
    null = true
    type = sql("timestamp")
  }

  column "RESPONSE_STATUS" {
    null = true
    type = sql("enum('TAKE','SKIP','SNOOZE')")
  }

  column "RESPONSE_AT" {
    null = true
    type = sql("timestamp")
  }

  column "SNOOZED_COUNT" {
    null = true
    type = sql("int")
  }

  column "NEXT_SNOOZE_AT" {
    null = true
    type = sql("timestamp")
  }

  column "DOSE" {
    null = true
    type = sql("int")
  }

  column "UNIT" {
    null = true
    type = sql("varchar(255)")
  }

  column "MEAL_RELATION" {
    null = true
    type = sql("enum('BEFORE_MEAL','AFTER_MEAL','WITH_MEAL','NONE')")
  }

  column "NOTE" {
    null = true
    type = sql("text")
  }

  primary_key {
    columns = [column.LOG_ID]
  }

  index "MEDICATION_LOG_PROFILE_ID_MEDI_LIST_ID_SCHEDULE_TIME_key" {
    unique  = true
    columns = [column.PROFILE_ID, column.MEDI_LIST_ID, column.SCHEDULE_TIME]
  }

  foreign_key "LOG_PROFILE_ID_fkey" {
    columns     = [column.PROFILE_ID]
    ref_columns = [table.USER_PROFILE.column.PROFILE_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }

  foreign_key "LOG_MEDI_LIST_ID_fkey" {
    columns     = [column.MEDI_LIST_ID]
    ref_columns = [table.MEDICINE_LIST.column.MEDI_LIST_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }
}

table "USER_MEDICINE_REGIMEN" {
  schema = schema.public

  column "MEDI_REGIMEN_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "MEDI_LIST_ID" {
    null = true
    type = sql("int")
  }

  column "SCHEDULE_TYPE" {
    null = false
    type = sql("enum('DAILY','WEEKLY','INTERVAL','CYCLE')")
  }

  column "START_DATE" {
    null = false
    type = sql("timestamp")
  }

  column "END_DATE" {
    null = true
    type = sql("timestamp")
  }

  column "DAYS_OF_WEEK" {
    null = true
    type = sql("varchar(255)")
  }

  column "INTERVAL_DAYS" {
    null = true
    type = sql("int")
  }

  column "CYCLE_ON_DAYS" {
    null = true
    type = sql("int")
  }

  column "CYCLE_BREAK_DAYS" {
    null = true
    type = sql("int")
  }

  column "NEXT_OCCURRENCE_AT" {
    null = true
    type = sql("timestamp")
  }

  primary_key {
    columns = [column.MEDI_REGIMEN_ID]
  }

  foreign_key "USER_MEDICINE_REGIMEN_MEDI_LIST_ID_fkey" {
    columns     = [column.MEDI_LIST_ID]
    ref_columns = [table.MEDICINE_LIST.column.MEDI_LIST_ID]
    on_update   = CASCADE
    on_delete   = SET_NULL
  }
}

table "USER_MEDICINE_REGIMEN_TIME" {
  schema = schema.public

  column "TIME_ID" {
    null           = false
    type           = sql("int")
    auto_increment = true
  }

  column "MEDI_REGIMEN_ID" {
    null = false
    type = sql("int")
  }

  column "TIME_OF_DAY" {
    null = false
    type = sql("varchar(255)")
  }

  column "DOSE" {
    null = false
    type = sql("int")
  }

  column "UNIT" {
    null = false
    type = sql("varchar(255)")
  }

  column "MEAL_RELATION" {
    null = false
    type = sql("enum('BEFORE_MEAL','AFTER_MEAL','WITH_MEAL','NONE')")
  }

  column "MEAL_OFFSET_MINUTES" {
    null = true
    type = sql("int")
  }

  primary_key {
    columns = [column.TIME_ID]
  }

  foreign_key "USER_MEDICINE_REGIMEN_TIME_MEDI_REGIMEN_ID_fkey" {
    columns     = [column.MEDI_REGIMEN_ID]
    ref_columns = [table.USER_MEDICINE_REGIMEN.column.MEDI_REGIMEN_ID]
    on_update   = CASCADE
    on_delete   = RESTRICT
  }
}

schema "public" {
  comment = "standard public schema"
}
