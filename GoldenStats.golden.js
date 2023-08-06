const fs = require('fs');

Number.prototype.checkNAN = function(ifNaNValue) {
    if (isNaN(this)) return ifNaNValue;
    else return this;
}

String.prototype.checkNAN = function(ifNaNValue) {
    if (isNaN(this) || this.toString() === 'NaN') return ifNaNValue;
    else return this;
}

class GetterSetter {
    listeners = [];
    constructor(defaultValue) {
        this.value = defaultValue;
    };

    get() {
        return this.value;
    }

    set(value) {
        this.value = value;

        this.listeners.forEach(cb => {
            cb(this.value);
        })
    }

    registerListener(cb) {
        this.listeners.push(cb);
    }

    
}

const rank_to_text = (paidRank, rank, username) => {
    switch (rank) {
        case 'YOUTUBER':
            return '&f[&cYOUTUBE&f] &c' + username + '&r'
        case 'ADMIN':
            return '&c[ADMIN] ' + username + '&r' 
    }

    switch (paidRank) {
        case 'MVP_PLUS_PLUS':
            return '&6[MVP&c++&6] ' + username + '&r'
        case 'MVP_PLUS':
            return '&b[MVP&c+&b] ' + username + '&r'
        case 'MVP':
            return '&b[MVP] ' + username + '&r'
        case 'VIP_PLUS':
            return '&a[VIP&6+&a] ' + username + '&r'
        case 'VIP':
            return '&a[VIP] ' + username + '&r'
        default /* NON */:
            return '&7' + username + '&r'
    }

}

const get_player_stats = (player, api_key) => {
    /*
        @param player: The player's username
        @param api_key: The Hypixel API key
        @return: A JSON object containing the player's stats
        @description: Gets the player's stats from the Hypixel API. This code has been taken from https://github.com/anotherpillow/opal-overlay
    */
    const apiURL = 'https://api.hypixel.net/player?key=' + api_key + '&uuid=';
    let returnData = new GetterSetter({
        nick: true,
        name: player,
        bwStats: {
            star: 0,
            finalKills: "?",
            bedsBroken: "?",
            wins: "?",
            kills: "?",
            deaths: "?",
            losses: "?",
            finalDeaths: "?",
            bedsLost: "?",
        },
        rank: "NULL",
        paidRank:"NON",
    });

    try {
        let nick = false;
        let j;
        fetch("https://api.mojang.com/users/profiles/minecraft/" + player).then(res=>{
            if (res.status === 200) {
                j = res.json();
            } else {
                j = new Promise((resolve, reject) => {
                    resolve({
                        name: player,
                        id: "NULL",
                    });
                })
            }
            j.then(json=>{
            
                if (res.status === 204) nick = true;
                let uuid;
                try {
                    if (json.id && !nick) uuid = json.id;
                } catch (_) {
                    uuid = "NULL"
                }

                fetch(apiURL + uuid).then(res => res.json()).then(hyp => {
                    // console.log("recv hypixel data")
                    let truncated_hyp = JSON.stringify(hyp).substring(0, 100);
                    // console.log(truncated_hyp + " " + uuid + " " + player)
                    let data = {
                        bwStats: {}
                    }
                    data.nick = nick;
                    if (hyp.player === null || hyp.player === undefined || nick === true) data.nick = true;
                    if (!nick) {
                        data.uuid = uuid;
                        data.name = player;
                        
                        data.channel = 'opal-extra'
                        try {data.paidRank = hyp.player.newPackageRank || "NON";} catch (_){}
                        try {data.rank = hyp.player.rank || "NULL";} catch (_){}

                        try {if (hyp.player.monthlyPackageRank === 'SUPERSTAR') data.paidRank = 'MVP_PLUS_PLUS';} catch (_){}

                        if (data.name.match(/^Antisniperbot(\d+)$/g) || data.name === 'SniperDected') data.channel = 'opal-bot'

                        let tfinals = 0;
                        let tbeds = 0;
                        let twins = 0;
                        let tkills = 0;
                        let tdeaths = 0;
                        let tlosses = 0;
                        let tfinald = 0;
                        let tbedslost = 0;

                        let bedwars = {}
                        try {
                            bedwars = hyp.player.stats.Bedwars
                            tfinals = bedwars.final_kills_bedwars;
                            tbeds = bedwars.beds_broken_bedwars;
                            twins = bedwars.wins_bedwars;
                            tkills = bedwars.kills_bedwars;
                            tdeaths = bedwars.deaths_bedwars;
                            tlosses = bedwars.losses_bedwars;
                            tfinald = bedwars.final_deaths_bedwars;
                            tbedslost = bedwars.beds_lost_bedwars;
                        } catch (_){}
                        
                        
                        if (tfinals + tbeds + twins + tkills + tdeaths + tlosses + tfinald > 0) {
                            data.bwStats = {
                                finalKills: tfinals,
                                bedsBroken: tbeds,
                                wins: twins,
                                kills: tkills,
                                deaths: tdeaths,
                                losses: tlosses,
                                finalDeaths: tfinald,
                                bedsLost: tbedslost,
                            }
                        } else {
                            data.bwStats = {
                                finalKills: "?",
                                bedsBroken: "?",
                                wins: "?",
                                kills: "?",
                                deaths: "?",
                                losses: "?",
                                finalDeaths: "?",
                                bedsLost: "?",
                            }
                        }
                        try {if (hyp.player.achievements.bedwars_level >= 0) data.bwStats.star = hyp.player.achievements.bedwars_level;}
                        catch (_){data.bwStats.star = 0;}
                        
                        if (data.nick) data.bwStats.star = 'NICKED'
                    } else {
                        data.name = player;
                        data.rank = "NULL";
                        data.paidRank = "NON";
                    }
                    //console.log(data)
                    returnData.set(data);
                })
            })
        })
    } catch (_) {
        returnData.set({
            nick: true,
            name: player,
            bwStats: {
                star:0,
            },
            rank: "NULL",
            paidRank:"NON",
        })
    }
    
    return returnData;
}

const genCol = (stat, type='fkdr') => {
    // if (stat < 2) return '&7';
    // else if (stat > 2) return '&6';
    // else if (stat > 5) return '&c';
    // else if (stat > 10) return '&4';
    // else if (stat > 20) return '&5';
    switch (type) {
        case 'fkdr':
            if (stat < 1) return '&7';
            else if (stat < 3) return '&f';
            else if (stat < 5) return '&6';
            else if (stat < 10) return '&3';
            else if (stat < 25) return '&4';
            else if (stat > 25) return '&5';
        case 'wlr':
            if (stat < 1) return '&7';
            else if (stat < 2) return '&f';
            else if (stat < 5) return '&6';
            else if (stat < 7) return '&3';
            else if (stat < 10) return '&4';
            else if (stat > 10) return '&5';
        case 'finals':
            if (stat < 1000) return '&7';
            else if (stat < 5000) return '&f';
            else if (stat < 10000) return '&6';
            else if (stat < 20000) return '&3';
            else if (stat < 30000) return '&4';
            else if (stat > 30000) return '&5';
        case 'wlr':
            if (stat < 1) return '&7';
            else if (stat < 2) return '&f';
            else if (stat < 5) return '&6';
            else if (stat < 7) return '&3';
            else if (stat < 10) return '&4';
            else if (stat > 10) return '&5';
        case 'bblr':
            if (stat < 1) return '&7';
            else if (stat < 2) return '&f';
            else if (stat < 5) return '&6';
            else if (stat < 7) return '&3';
            else if (stat < 10) return '&4';
            else if (stat > 10) return '&5';
        case 'kdr':
            if (stat < 1) return '&7';
            else if (stat < 3) return '&f';
            else if (stat < 5) return '&6';
            else if (stat < 10) return '&3';
            else if (stat < 25) return '&4';
            else if (stat > 25) return '&5';
        default:
            return '&7';
    }
}


module.exports = class {
    constructor(logger, config, api) {
        this.logger = logger;
        this.config = config;
        this.api = api;

        this.chat = api.chatlog;

        this.logger.success('GoldenStats loaded!');

        this.config = api.config;

        this.api.commands.register('/set_api_key', (args, client) => {
            const key = args[0];
            this.chat.info('Setting API key...');
            this.config.set('api-key', key);
            this.config.save();
            let obfuscatedKey = key.substring(0, 4) + key.substring(4).replace(/[a-zA-Z0-9]/g, '*');
            


            this.chat.small(`API key set to ${obfuscatedKey}`);
            
        });

        this.api.commands.register('/stats', (args, client) => {
            const username = args[0] || client.username;

            // this.chat.info('Getting stats for ' + username);

            get_player_stats(username, this.config.get('api-key')).registerListener(data => {
                const ranked = api.util.colourify(rank_to_text(data.paidRank, data.rank, username));
                const star = `[${data.bwStats.star}✫]`;
                //this.chat.small(JSON.stringify(data));
                const fkdr = (data.bwStats.finalKills / data.bwStats.finalDeaths).toFixed(2).checkNAN(0) || 0;
                const fkdr_col = genCol(fkdr, 'fkdr');

                const wlr = (data.bwStats.wins / data.bwStats.losses).toFixed(2).checkNAN(0) || 0;
                const wlr_col = genCol(wlr, 'wlr');

                const bblr = (data.bwStats.bedsBroken / data.bwStats.bedsLost).toFixed(2).checkNAN(0) || 0;
                const bblr_col = genCol(bblr, 'bblr');

                const kdr = (data.bwStats.kills / data.bwStats.deaths).toFixed(2).checkNAN(0) || 0;
                const kdr_col = genCol(kdr, 'kdr');
                

                this.chat.small(`${star} ${ranked}'s stats:`);
                this.chat.small(`Final Kills: ${data.bwStats.finalKills} [FKDR: ${api.util.colourify(fkdr_col + fkdr) + '&r'}]`);
                this.chat.small(`Beds Broken: ${data.bwStats.bedsBroken} [BBLR: ${api.util.colourify(bblr_col + bblr) + '&r'}]`);
                this.chat.small(`Wins: ${data.bwStats.wins} [WLR: ${api.util.colourify(wlr_col + wlr) + '&r'}]`);
                this.chat.small(`Kills: ${data.bwStats.kills} [KDR: ${api.util.colourify(kdr_col + kdr) + '&r'}]`);

            });

            
        });
    }
}