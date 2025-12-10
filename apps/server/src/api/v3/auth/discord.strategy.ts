import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import * as Strategy from 'passport-discord';
import { LootexJwtPayload } from './auth.interface';

type Done = (err: Error | null, user?: any, info?: any) => void;

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, 'discord') {
  constructor(private readonly jwtService: JwtService) {
    super({
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/api/v3/auth/discord/callback`,
      scope: ['identify', 'email', 'guilds', 'guilds.members.read'],
      passReqToCallback: true,
    });
  }

  async validate(
    req,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Done,
  ) {
    if (!req.cookies.lootex_auth) {
      return done(
        new Error('AuthJwt: access denied, no cookies lootex_auth'),
        false,
      );
    }

    const jwdValue = this.jwtService.decode(
      req.cookies.lootex_auth,
    ) as LootexJwtPayload;

    if (!jwdValue) {
      return done(new Error('AuthJwt: access denied, cannot parse JWT'), false);
    }

    const now = Date.now() / 1000;
    if (now > jwdValue.exp) {
      return done(new Error('AuthJwt: access denied, JWT expired'), false);
    }

    // Handle user cancelling the authorization
    if (!profile) {
      return done(new Error('AuthJwt: user cancelled authorization'), false);
    }

    const user = {
      accountId: jwdValue.sub,
      providerAccountId: profile.id,
      accessToken: accessToken,
      refreshToken: refreshToken,
      email: profile.email,
      name: profile.username,
      picture: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
    };

    done(null, user);
  }
}
