WITH
daily_set AS (
    INSERT INTO inferno_daily_sets (game_date)
    VALUES (NOW()::DATE)
    RETURNING id AS set_id
),

guild_insert AS (
    INSERT INTO guilds (guild_id, name)
    SELECT '1', 'ikz87'
    WHERE NOT EXISTS (
        SELECT 1 FROM guilds WHERE guild_id = '1' AND name = 'ikz87'
    )
    RETURNING guild_id AS guild_id
),

submitter_profile AS (
    INSERT INTO submitter_profiles(
        discord_user_id,
        discord_name,
        discord_avatar_url
    )
    VALUES (
        'discord_user_id',
        'Nichi Hachi',
        'https://media1.tenor.com/m/2U8mtjp1GPEAAAAd/dead-cells-giggle.gif')
    RETURNING id AS submitter_id
),

image_submissions AS (
    INSERT INTO image_submissions (
        guild_id,
        channel_id,
        message_id,
        level_id,
        submitter_id,
        image_url,
        status
    )
    SELECT
        '1',
        'channel_id',
        'message_id_' || level_id,
        level_id,
        (SELECT submitter_id FROM submitter_profile),
        CASE level_id
        WHEN 1 THEN 'https://ultrakill.wiki.gg/images/0-1_Into_the_Fire.webp'
        WHEN 2 THEN 'https://ultrakill.wiki.gg/images/0-2_The_Meatgrinder.webp'
        WHEN 3 THEN 'https://ultrakill.wiki.gg/images/0-3_Double_Down.webp'
        WHEN 4 THEN 'https://ultrakill.wiki.gg/images/0-4_A_One-Machine_Army.webp'
        WHEN 5 THEN 'https://ultrakill.wiki.gg/images/0-5_Cerberus.webp'
        END,
        'status'
    FROM generate_series(1, 5) AS level_id
    RETURNING id AS submission_id, level_id
)

INSERT INTO inferno_daily_rounds (
    set_id,
    round_number,
    image_submission_id,
    correct_level_id,
    public_image_url,
    submitter_id
)
SELECT
    (SELECT set_id FROM daily_set),
    level_id,
    submission_id,
    level_id,
    CASE level_id
        WHEN 1 THEN 'https://ultrakill.wiki.gg/images/0-1_Into_the_Fire.webp'
        WHEN 2 THEN 'https://ultrakill.wiki.gg/images/0-2_The_Meatgrinder.webp'
        WHEN 3 THEN 'https://ultrakill.wiki.gg/images/0-3_Double_Down.webp'
        WHEN 4 THEN 'https://ultrakill.wiki.gg/images/0-4_A_One-Machine_Army.webp'
        WHEN 5 THEN 'https://ultrakill.wiki.gg/images/0-5_Cerberus.webp'
    END,
    (SELECT submitter_id FROM submitter_profile)
FROM image_submissions;
